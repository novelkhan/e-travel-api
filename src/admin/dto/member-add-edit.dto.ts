import { IsString, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class MemberAddEditDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;
}