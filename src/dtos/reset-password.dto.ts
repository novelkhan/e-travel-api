import { IsNotEmpty, Length, Matches } from 'class-validator';

export class ResetPasswordDto {
  @IsNotEmpty({ message: 'Token is required' })
  token: string;

  @IsNotEmpty({ message: 'Email is required' })
  @Matches(/^[\w-]+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/, {
    message: 'Invalid email address',
  })
  email: string;

  @IsNotEmpty({ message: 'New Password is required' })
  @Length(6, 15, {
    message: 'New Password must be at least 6, and maximum 15 characters',
  })
  newPassword: string;
}