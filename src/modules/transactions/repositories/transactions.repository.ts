import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';

import * as R from 'ramda';
import { ClientSession, DeleteResult, Model } from 'mongoose';

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
      const [created] = await this._txModel.create([{...createTransactionData, userId: toObjectId(createTransactionData.userId)}], { session });

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

  async countDocuments(query: FilterTransactionsDto): Promise<number> {
    const filterQuery = cleanObject(buildQuery(query));

    return this._txModel.countDocuments(filterQuery).lean();
  }

  async findAll(query: FilterTransactionsDto): Promise<IResponse<Transaction[]>> {
    const filterQuery = cleanObject(buildQuery(query));
    const { limit, page, sort } = extractQueryParams(query);

    const [transactions, total] = await Promise.all([
      this._txModel.find(filterQuery).limit(limit).skip(page * limit).sort({ ...sort }).lean(),
      this.countDocuments(query)
    ]);

    const meta = getQueryMetadata(query, total);

    return { data: transactions, meta };
  }

  // findAll() {
  //   const pipeline = [
  //     { $match: { userId, ...filters } },

  //     // group exchanges by exchangeGroupId, otherwise each tx groups by itself
  //     {
  //       $addFields: {
  //         groupKey: { $ifNull: ['$exchangeGroupId', { $toString: '$_id' }] },
  //         isExchange: { $cond: [{ $ifNull: ['$exchangeGroupId', false] }, true, false] },
  //       },
  //     },

  //     {
  //       $group: {
  //         _id: '$groupKey',
  //         isExchange: { $max: '$isExchange' },
  //         date: { $max: '$date' }, // or $min — pick one and be consistent
  //         createdAt: { $max: '$createdAt' },
  //         items: { $push: '$$ROOT' },
  //       },
  //     },

  //     { $sort: { date: -1, createdAt: -1 } },

  //     // paginate groups, not documents
  //     { $skip: skip },
  //     { $limit: limit },

  //     // shape the response
  //     {
  //       $project: {
  //         _id: 0,
  //         kind: { $cond: ['$isExchange', 'exchange', 'transaction'] },
  //         exchangeGroupId: { $cond: ['$isExchange', '$_id', null] },
  //         date: 1,
  //         items: 1,
  //       },
  //     },
  //   ];

  //   return `This action returns all transactions`;
  // }

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
