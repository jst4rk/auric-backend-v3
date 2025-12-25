// transactions.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { ECurrency, EKind, ETransactionType } from '../../common/enums';

@Schema({
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
})
export class Transaction {
    @Prop({ type: Types.ObjectId, required: true })
    userId: Types.ObjectId;

    @Prop({ required: true, enum: ETransactionType })
    type: ETransactionType;

    @Prop({ type: Number, required: true })
    amount: number;

    @Prop({ required: true, enum: ECurrency })
    currency: ECurrency;

    @Prop({ type: String, required: false, trim: true })
    description?: string;

    @Prop({ required: true })
    category: string;

    @Prop({ required: false, type: [String], default: [] })
    tags?: string[];

    @Prop({ type: String, required: true })
    idempotencyKey: string;

    @Prop({ type: String })
    exchangeGroupId?: string;

    @Prop({ required: false, enum: EKind })
    kind?: EKind;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);

// 🔐 Important indexes
TransactionSchema.index({ userId: 1, date: 1 });
TransactionSchema.index({ userId: 1, type: 1 });
TransactionSchema.index({ userId: 1, category: 1 });
TransactionSchema.index({ userId: 1, kind: 1, exchangeGroupId: 1 });
TransactionSchema.index(
    { userId: 1, idempotencyKey: 1 },
    { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } },
);
