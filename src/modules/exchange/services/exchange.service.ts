// exchange.service.ts
import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';

import { Connection, Types } from 'mongoose';
import { randomUUID } from 'crypto';

import { TransactionsRepository } from '../../transactions/repositories/transactions.repository';
import { UsersRepository } from '../../users/repositories/users.repository';
import { CreateExchangeDto } from '../dto/create-exchange.dto';
import { ECurrency, EKind, ETransactionType } from '../../common/enums';
import { ExchangeRepository } from '../repositories/exchange.repository';
import { FilterExchangeDto } from '../dto/filter-exchange.dto';
import { IResponse } from '../../common/interfaces/response.interface';
import { Exchange } from '../entities/exchange.entity';

@Injectable()
export class ExchangeService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly _exchangeRepo: ExchangeRepository,
    private readonly txRepo: TransactionsRepository,
    private readonly usersRepo: UsersRepository,
  ) { }

  async findAll(query: FilterExchangeDto): Promise<IResponse<Exchange[]>> {
    try {
      const exchangesResponse = await this._exchangeRepo.findAll(query);

      return exchangesResponse;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  async create(exchangeData: CreateExchangeDto) {
    // ✅ business validation
    if (exchangeData.fromCurrency === exchangeData.toCurrency) {
      throw new BadRequestException('fromCurrency and toCurrency must be different');
    }

    const isPair =
      (exchangeData.fromCurrency === ECurrency.USD && exchangeData.toCurrency === ECurrency.CUP) ||
      (exchangeData.fromCurrency === ECurrency.CUP && exchangeData.toCurrency === ECurrency.USD);

    if (!isPair) throw new BadRequestException('Only USD <-> CUP exchanges are supported');

    const user = await this.usersRepo.findById(exchangeData.userId);
    if (!user) throw new NotFoundException('User not found');

    if (!user.rateUsdToCup || user.rateUsdToCup <= 0) {
      throw new BadRequestException('Invalid user exchange rate');
    }

    const rate = user.rateUsdToCup;
    const fromAmount = exchangeData.fromAmount;

    // ✅ business calculation
    const toAmount = (exchangeData.fromCurrency === ECurrency.USD)
      ? fromAmount * rate
      : fromAmount / rate;

    const roundedToAmount = Number(toAmount.toFixed(2));
    const exchangeGroupId = randomUUID();
    const userObjectId = new Types.ObjectId(exchangeData.userId);

    const session = await this.connection.startSession();

    try {
      session.startTransaction();

      const dec = await this.usersRepo.decBalanceIfEnough(
        exchangeData.userId,
        exchangeData.fromCurrency,
        fromAmount,
        session,
      );

      if (dec.modifiedCount === 0) {
        throw new BadRequestException(`Insufficient ${exchangeData.fromCurrency} balance`);
      }

      await this.usersRepo.incBalance(
        exchangeData.userId,
        exchangeData.toCurrency,
        roundedToAmount,
        session,
      );

      const [fromLegTx, toLegTx] = await this.txRepo.createMany(
        [
          {
            userId: userObjectId,
            type: ETransactionType.EXPENSE,
            kind: EKind.EXCHANGE,
            exchangeGroupId,
            currency: exchangeData.fromCurrency,
            amount: fromAmount,
            category: 'exchange',
            idempotencyKey: `${exchangeGroupId}-from`,
            description: `Exchange to ${exchangeData.toCurrency} @ ${rate}`,
          },
          {
            userId: userObjectId,
            type: ETransactionType.INCOME,
            kind: EKind.EXCHANGE,
            exchangeGroupId,
            currency: exchangeData.toCurrency,
            amount: roundedToAmount,
            category: 'exchange',
            idempotencyKey: `${exchangeGroupId}-to`,
            description: `Exchange from ${exchangeData.fromCurrency} @ ${rate}`,
          },
        ],
        session,
      );

      const exchangeDoc = await this._exchangeRepo.createOne(
        {
          userId: userObjectId,
          exchangeGroupId,
          rateUsdToCup: rate,
          fromCurrency: exchangeData.fromCurrency,
          fromAmount,
          toCurrency: exchangeData.toCurrency,
          toAmount: roundedToAmount,
          legs: [
            { transactionId: fromLegTx._id, type: ETransactionType.EXPENSE, currency: exchangeData.fromCurrency, amount: fromAmount },
            { transactionId: toLegTx._id, type: ETransactionType.INCOME, currency: exchangeData.toCurrency, amount: roundedToAmount },
          ],
        },
        session,
      );

      await session.commitTransaction();

      return {
        exchange: (exchangeDoc as any).toJSON?.() ?? exchangeDoc,
        transactions: [fromLegTx.toJSON(), toLegTx.toJSON()],
      };
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }
}
