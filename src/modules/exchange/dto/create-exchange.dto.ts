import { IsEnum, IsMongoId, IsNumber, IsPositive } from 'class-validator';
import { ECurrency } from '../../common/enums';

export class CreateExchangeDto {
    @IsMongoId()
    userId: string;

    @IsEnum(ECurrency)
    fromCurrency: ECurrency;

    @IsEnum(ECurrency)
    toCurrency: ECurrency;

    @IsNumber()
    @IsPositive()
    fromAmount: number;
}
