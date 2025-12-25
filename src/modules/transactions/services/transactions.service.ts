import { HttpException, Injectable } from '@nestjs/common';

import { CreateTransactionDto } from '../dto/create-transaction.dto';
import { TransactionsRepository } from '../repositories/transactions.repository';
import { FilterTransactionsDto } from '../dto/filter-transactions.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly _transactionsRepository: TransactionsRepository) { }

  async create(createTransactionDto: CreateTransactionDto) {
    try {
      const transaction = await this._transactionsRepository.create(createTransactionDto);

      return transaction;
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  findAll(query: FilterTransactionsDto) {
    try {
      return this._transactionsRepository.findAll(query);
    } catch (error) {
      throw new HttpException(error.message, error.status || 500);
    }
  }

  findOne(id: number) {
    return `This action returns a #${id} transaction`;
  }
}
