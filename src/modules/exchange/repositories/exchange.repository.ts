import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import * as R from 'ramda';
import { ClientSession, Model, Types } from 'mongoose';

import { Exchange } from '../entities/exchange.entity';
import { ECurrency, ETransactionType } from '../../common/enums';
import { FilterExchangeDto } from '../dto/filter-exchange.dto';
import { cleanObject, getQueryMetadata, includeIfPresent } from '../../common/functions/helpers-fns';
import { convertDateRange, extractQueryParams, toObjectId } from '../../common/functions/query';
import { IResponse } from '../../common/interfaces/response.interface';

export interface CreateExchangeDocInput {
  userId: Types.ObjectId;
  exchangeGroupId: string;
  rateUsdToCup: number;
  legs: { transactionId: Types.ObjectId; type: ETransactionType; currency: ECurrency; amount: number }[];
  fromCurrency?: ECurrency;
  fromAmount?: number;
  toCurrency?: ECurrency;
  toAmount?: number;
}

const buildQuery: (query: FilterExchangeDto) => Record<string, any> = R.applySpec({
  _id: includeIfPresent('id'),
  userId: includeIfPresent('userId', { cast: toObjectId }),
  createdAt: convertDateRange('startDate', 'endDate'),
  deletedAt: R.always(null),
});

@Injectable()
export class ExchangeRepository {
  constructor(
    @InjectModel(Exchange.name) private readonly exchangeModel: Model<Exchange>,
  ) { }

  async createOne(input: CreateExchangeDocInput, session: ClientSession) {
    const [doc] = await this.exchangeModel.create([input], { session, ordered: true });

    return doc;
  }

  async countDocuments(query: FilterExchangeDto): Promise<number> {
    const filterQuery = cleanObject(buildQuery(query));
    return this.exchangeModel.countDocuments(filterQuery).lean();
  }

  async findAll(query: FilterExchangeDto): Promise<IResponse<Exchange[]>> {
    const filterQuery = cleanObject(buildQuery(query));
    const { limit, page, sort } = extractQueryParams(query);

    const [exchanges, total] = await Promise.all([
      this.exchangeModel.find(filterQuery).limit(limit).skip(page * limit).sort({ ...sort }).lean(),
      this.countDocuments(query)
    ]);

    const meta = getQueryMetadata(query, total);

    return { data: exchanges, meta };
  }

  async findByGroupId(userId: string, exchangeGroupId: string) {
    return this.exchangeModel
      .findOne({ userId: new Types.ObjectId(userId), exchangeGroupId })
      .lean();
  }
}
