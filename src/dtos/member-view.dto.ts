export class MemberViewDto {
  id: string;
  userName: string;
  firstName: string;
  lastName: string;
  isLocked: boolean;
  dateCreated: Date;
  isEmailConfirmed: boolean;
  roles: string[];
}