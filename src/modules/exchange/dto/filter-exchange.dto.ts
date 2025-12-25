import { IsDateString, IsEnum, IsMongoId, IsNumber, IsOptional, IsPositive } from 'class-validator';
import { ECurrency } from '../../common/enums';
import { BaseFiltersDto } from '../../common/dto/base-filters.dto';

export class FilterExchangeDto extends BaseFiltersDto {
    @IsMongoId()
    userId: string;

    @IsOptional()
    @IsDateString()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    endDate?: string;
}
