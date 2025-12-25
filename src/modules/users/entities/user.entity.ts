// users.schema.ts
import { Prop, Schema, SchemaFactory, Virtual } from '@nestjs/mongoose';
import { ECurrency } from '../../common/enums';

@Schema({ timestamps: true, versionKey: false, toJSON: { virtuals: true } })
export class User {
    @Prop({ required: true, trim: true })
    firstName: string;

    @Prop({ required: true, trim: true })
    lastName: string;

    @Prop({ required: true })
    email: string;

    /**
   * Balances stored in minor units (integers):
   * - USD: cents
   * - CUP: centavos
   */
    @Prop({
        type: Object,
        required: true,
        default: { USD: 0, CUP: 0 },
    })
    balances: Record<ECurrency, number>;

    @Prop({
        required: true,
        enum: ECurrency,
        default: ECurrency.USD,
    })
    preferredCurrency: ECurrency;

    @Prop({
        required: true,
        default: 1,
    })
    rateUsdToCup: number;

    @Virtual({
        get: function (this: User) {
            return `${this.firstName} ${this.lastName}`;
        },
    })
    fullName: string;

    @Prop({ required: true })
    password: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.index({ email: 1 }, { unique: true });

// UserSchema.pre("save", async function (next) {
//     if (!this.isModified("password")) return next();
//     try {
//         const salt = await bcrypt.genSalt(12);
//         this.password = await bcrypt.hash(this.password, salt);
//         return next();
//     } catch (error) {
//         return next(error);
//     }
// });
