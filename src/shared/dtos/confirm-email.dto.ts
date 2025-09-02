import { IsNotEmpty, Matches } from 'class-validator';

export class ConfirmEmailDto {
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsNotEmpty({ message: 'Email is required' })
  @Matches(/^[\w-]+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/, {
    message: 'Invalid email address',
  })
  email: string;
}