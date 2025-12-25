import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateUserDto {
    @IsString()
    readonly firstName: string;
    
    @IsString()
    readonly lastName: string;

    @IsEmail()
    readonly email: string;

    @IsNumber()
    @Min(1)
    readonly rateUsdToCup: number;

    @IsOptional() // TODO for now
    @IsString()
    readonly password?: string;
}


