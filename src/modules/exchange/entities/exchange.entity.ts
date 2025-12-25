
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import { ECurrency, ETransactionType } from '../../common/enums';
import { Types } from 'mongoose';


@Schema({ _id: false, timestamps: false, versionKey: false })
export class ExchangeLeg {
  @Prop({ type: Types.ObjectId, required: true, })
  transactionId: Types.ObjectId;

  @Prop({ type: String, enum: ETransactionType, required: true })
  type: ETransactionType;

  @Prop({ type: String, enum: ECurrency, required: true })
  currency: ECurrency;

  @Prop({ type: Number, required: true, min: 0 })
  amount: number;
}

export const ExchangeLegSchema = SchemaFactory.createForClass(ExchangeLeg);

@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false,
})
export class Exchange {
  @Prop({ type: Types.ObjectId, required: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, unique: true })
  exchangeGroupId: string;

  @Prop({ type: Number, required: true, min: 0 })
  rateUsdToCup: number;

  @Prop({ type: [ExchangeLegSchema], required: true, validate: [(v: any[]) => v?.length === 2, 'legs must have 2 items'] })
  legs: [ExchangeLeg, ExchangeLeg];

  // Optional convenience fields (nice for UI)
  @Prop({ type: String, enum: ECurrency, required: true })
  fromCurrency: ECurrency;

  @Prop({ type: Number, required: true, min: 0 })
  fromAmount: number;

  @Prop({ type: String, enum: ECurrency, required: true })
  toCurrency: ECurrency;

  @Prop({ type: Number, required: true, min: 0 })
  toAmount: number;
}

export const ExchangeSchema = SchemaFactory.createForClass(Exchange);

ExchangeSchema.index({ userId: 1, createdAt: -1 });
ExchangeSchema.index({ userId: 1, exchangeGroupId: 1, createdAt: -1 });