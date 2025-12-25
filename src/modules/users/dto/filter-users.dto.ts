import { IsEmail, IsOptional, IsString } from 'class-validator';
import { BaseFiltersDto } from '../../common/dto/base-filters.dto';

export class FilterUsersDto extends BaseFiltersDto {
    @IsOptional()
    @IsString()
    firstName: string;
    
    @IsOptional()
    @IsString()
    lastName: string;

    @IsOptional()
    @IsEmail()
    email: string;

    @IsOptional() // TODO for now
    @IsString()
    password?: string;
}


