import { IsEnum, IsInt, Min, IsOptional, IsString, MaxLength, IsArray, ArrayMaxSize, IsDateString, IsMongoId } from 'class-validator';

import { ECurrency, ETransactionType } from '../../common/enums';

export class CreateTransactionDto {
    @IsString()
    @IsMongoId()
    userId: string;

    @IsEnum(ETransactionType)
    type: ETransactionType;

    // Amount in minor units (cents)
    @IsInt()
    @Min(1)
    amount: number;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @IsString()
    @MaxLength(80)
    category: string;

    @IsOptional()
    @IsArray()
    @ArrayMaxSize(25)
    @IsString({ each: true })
    @MaxLength(40, { each: true })
    tags?: string[];

    @IsOptional()
    @IsEnum(ECurrency)
    currency?: ECurrency;

    @IsString()
    // @MaxLength(120)
    idempotencyKey: string;
}
