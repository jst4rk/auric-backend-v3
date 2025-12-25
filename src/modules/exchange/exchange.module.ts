import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ExchangeService } from './services/exchange.service';
import { ExchangeController } from './controllers/exchange.controller';
import { TransactionsModule } from '../transactions/transactions.module';
import { UsersModule } from '../users/users.module';
import { Exchange, ExchangeSchema } from './entities/exchange.entity';
import { ExchangeRepository } from './repositories/exchange.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Exchange.name, schema: ExchangeSchema }]),
    TransactionsModule,
    UsersModule,
  ],
  controllers: [ExchangeController],
  providers: [ExchangeService, ExchangeRepository],
})
export class ExchangeModule {}
