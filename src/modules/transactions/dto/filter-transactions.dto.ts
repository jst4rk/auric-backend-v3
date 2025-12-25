import {
    IsArray,
    IsDateString,
    IsEnum,
    IsMongoId,
    IsOptional,
    IsString,
} from 'class-validator';

import { ETransactionType } from '../../common/enums';
import { BaseFiltersDto } from '../../common/dto/base-filters.dto';

export class FilterTransactionsDto extends BaseFiltersDto {
    @IsOptional()
    @IsMongoId()
    userId?: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;

    @IsOptional()
    @IsEnum(ETransactionType)
    type?: ETransactionType;

    @IsOptional()
    @IsString()
    category?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}
