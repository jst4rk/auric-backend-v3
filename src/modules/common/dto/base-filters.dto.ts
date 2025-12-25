import { IsMongoId, IsNotEmpty, IsNumberString, IsOptional, IsString } from 'class-validator';

export class BaseFiltersDto {
  @IsOptional()
  @IsMongoId()
  _id?: string;

  @IsOptional()
  @IsNumberString()
  page?: number;

  @IsOptional()
  @IsNumberString()
  limit?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  sort?: string;
}
