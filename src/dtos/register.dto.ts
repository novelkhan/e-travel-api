import { IsNotEmpty, Length, Matches } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty({ message: 'First name is required' })
  @Length(3, 15, {
    message: 'First name must be at least 3, and maximum 15 characters',
  })
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @Length(3, 15, {
    message: 'Last name must be at least 3, and maximum 15 characters',
  })
  lastName: string;

  @IsNotEmpty({ message: 'Email is required' })
  @Matches(/^[\w-]+@[a-zA-Z_]+?\.[a-zA-Z]{2,3}$/, {
    message: 'Invalid email address',
  })
  email: string;

  @IsNotEmpty({ message: 'Password is required' })
  @Length(6, 15, {
    message: 'Password must be at least 6, and maximum 15 characters',
  })
  password: string;
}