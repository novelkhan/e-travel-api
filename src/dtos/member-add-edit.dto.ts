import { IsNotEmpty } from 'class-validator';

export class MemberAddEditDto {
  id: string;

  @IsNotEmpty({ message: 'UserName is required' })
  userName: string;

  @IsNotEmpty({ message: 'FirstName is required' })
  firstName: string;

  @IsNotEmpty({ message: 'LastName is required' })
  lastName: string;

  password: string;

  @IsNotEmpty({ message: 'Roles is required' })
  // eg: "Admin,Player,Manager"
  roles: string;
}