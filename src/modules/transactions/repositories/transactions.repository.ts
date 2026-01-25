import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import * as R from 'ramda';
import { AggregateOptions, ClientSession, DeleteResult, Model, PipelineStage } from 'mongoose';

import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { Transaction } from '../entities/transaction.entity';
import { User } from '../../users/entities/user.entity';
import { ETransactionType } from '../../common/enums';
import { cleanObject, getQueryMetadata, includeIfPresent } from '../../common/functions/helpers-fns';
import { convertDateRange, extractQueryParams, toObjectId } from '../../common/functions/query';
import { FilterTransactionsDto } from '../dto/filter-transactions.dto';
import { IResponse } from '../../common/interfaces/response.interface';

const buildQuery: (query: FilterTransactionsDto) => Record<string, any> = R.applySpec({
  _id: includeIfPresent('_id'),
  userId: includeIfPresent('userId', { cast: toObjectId }),
  type: includeIfPresent('type'),
  category: includeIfPresent('category'),
  createdAt: convertDateRange('startDate', 'endDate'),
  deletedAt: R.always(null),
});

@Injectable()
export class TransactionsRepository {
  constructor(
    @InjectConnection()
    private readonly _connection,
    @InjectModel(Transaction.name)
    private readonly _txModel: Model<Transaction>,
    @InjectModel(User.name)
    private readonly _userModel: Model<User>,
  ) { }

  async create(createTransactionData: CreateTransactionDto): Promise<Transaction> {
    const session = await this._connection.startSession();

    try {
      session.startTransaction();

      const currency = createTransactionData.currency;
      const userBalancePath = `balances.${currency}`;
      const amountAbs = Math.abs(createTransactionData.amount);
      const isExpense = createTransactionData.type === ETransactionType.EXPENSE;
      const userFilter: any = { _id: createTransactionData.userId };

      if (isExpense) {
        userFilter[userBalancePath] = { $gte: amountAbs }; // enough money
      }

      const userUpdate = await this._userModel.updateOne(
        userFilter,
        {
          $inc: { [userBalancePath]: isExpense ? -amountAbs : amountAbs },
          $set: { updatedAt: new Date() },
        },
        { session },
      );

      // If user doesn't exist OR funds insufficient, update won't match anything
      if (userUpdate.matchedCount === 0) {
        // distinguish “user not found” vs “insufficient funds”
        const exists = await this._userModel.exists({ _id: createTransactionData.userId }).session(session);

        if (!exists) throw new NotFoundException('User not found');

        throw new ConflictException('Insufficient funds');
      }

      // ✅ 2) Only create the transaction AFTER balance update succeeds
      const [created] = await this._txModel.create([{ ...createTransactionData, userId: toObjectId(createTransactionData.userId) }], { session });

      await session.commitTransaction();

      return created.toJSON();
    } catch (error) {
      await session.abortTransaction();

      if (error?.code === 11000) {
        const originalTransaction = await this._txModel.findOne({
          idempotencyKey: createTransactionData.idempotencyKey,
        });

        if (!originalTransaction) {
          throw new ConflictException('Duplicate transaction (idempotency key already used).');
        }

        return originalTransaction.toJSON();
      }

      throw error;
    } finally {
      await session.endSession();
    }
  }

  async countDocuments(query: FilterTransactionsDto): Promise<any> {
    const filterQuery = cleanObject(buildQuery(query));

    const countPipeline: PipelineStage[] = [
      { $match: filterQuery },
      {
        $addFields: {
          groupKey: {
            $cond: [
              {
                $and: [
                  { $eq: ['$kind', 'exchange'] },
                  { $ifNull: ['$exchangeGroupId', false] },
                ],
              },
              '$exchangeGroupId',
              '$_id',
            ],
          },
        },
      },
      { $group: { _id: '$groupKey' } },
      { $count: 'total' },
    ];

    const [count] = await this._txModel.aggregate<{ total: number }>(countPipeline).exec()

    return count.total;
  }

  async findAll(query: FilterTransactionsDto): Promise<IResponse<Transaction[]>> {
    const filterQuery = cleanObject(buildQuery(query));
    const { limit, page, sort } = extractQueryParams(query);

    const skip = page * limit;
    const pipeline: any[] = [
      { $match: filterQuery },

      // groupKey: exchangeGroupId if kind=exchange and exchangeGroupId exists, else _id
      {
        $addFields: {
          groupKey: {
            $cond: [
              {
                $and: [
                  { $eq: ['$kind', 'exchange'] },
                  { $ifNull: ['$exchangeGroupId', false] },
                ],
              },
              '$exchangeGroupId',
              '$_id',
            ],
          },
        },
      },

      // group into "UI rows"
      {
        $group: {
          _id: '$groupKey',
          docs: { $push: '$$ROOT' },

          // these drive sorting + pagination at the "row" level
          createdAt: { $max: '$createdAt' },
        },
      },

      // sort grouped rows
      { $sort: sort },

      // pagination after grouping
      { $skip: skip },
      { $limit: limit },

      // split legs + shape output
      {
        $addFields: {
          expenseLeg: {
            $first: {
              $filter: {
                input: '$docs',
                as: 'd',
                cond: { $eq: ['$$d.type', 'expense'] },
              },
            },
          },
          incomeLeg: {
            $first: {
              $filter: {
                input: '$docs',
                as: 'd',
                cond: { $eq: ['$$d.type', 'income'] },
              },
            },
          },
          isExchange: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$docs',
                    as: 'd',
                    cond: { $eq: ['$$d.kind', 'exchange'] },
                  },
                },
              },
              0,
            ],
          },
        },
      },

      // return either merged exchange row OR the single normal doc
      {
        $project: {
          createdAt: 1,
          item: {
            $cond: [
              '$isExchange',
              {
                type: 'exchange',
                kind: 'exchange',
                category: 'exchange',
                exchangeGroupId: '$_id',
                createdAt: '$createdAt',

                from: {
                  _id: '$expenseLeg._id',
                  currency: '$expenseLeg.currency',
                  amount: '$expenseLeg.amount',
                  description: '$expenseLeg.description',
                },
                to: {
                  _id: '$incomeLeg._id',
                  currency: '$incomeLeg.currency',
                  amount: '$incomeLeg.amount',
                  description: '$incomeLeg.description',
                },

                rate: {
                  $cond: [
                    {
                      $and: [
                        { $gt: ['$incomeLeg.amount', 0] },
                        { $gt: ['$expenseLeg.amount', 0] },
                      ],
                    },
                    { $divide: ['$incomeLeg.amount', '$expenseLeg.amount'] },
                    null,
                  ],
                },
              },
              { $first: '$docs' },
            ],
          },
        },
      },

      { $replaceRoot: { newRoot: '$item' } },
    ];

    const [transactions, total] = await Promise.all([
      this._txModel.aggregate(pipeline).exec(),
      this.countDocuments(query)
    ]);

    const meta = getQueryMetadata(query, total);

    return { data: transactions, meta };
  }

  createMany(docs: Transaction[], session: ClientSession) {
    return this._txModel.insertMany(docs, { session, ordered: true });
  }

  async aggregate<T = any>(pipeline: any[]) {
    return await this._txModel.aggregate<T>(pipeline);
  }

  async remove(userId: string, id: string): Promise<DeleteResult> {
    const res = await this._txModel.deleteOne({ _id: id, userId });

    return res;
  }
}
