import { IsNotEmpty } from 'class-validator';
import { Entity, Column, PrimaryGeneratedColumn, OneToOne, OneToMany, CreateDateColumn, JoinColumn } from 'typeorm';
import { CustomerData } from './customer-data.entity';
import { RefreshToken } from './refresh-token.entity';
import { UserRole } from './user-role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  userName: string;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  passwordHash: string;

  @Column({ default: false })
  emailConfirmed: boolean;

  @Column({ default: false })
  lockoutEnabled: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lockoutEnd: Date;

  @Column({ default: 0 })
  accessFailedCount: number;

  @IsNotEmpty({ message: 'First name is required' })
  @Column()
  firstName: string;

  @IsNotEmpty({ message: 'Last name is required' })
  @Column()
  lastName: string;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreated: Date;

  // @Column({ nullable: true })
  // provider: string;

  @OneToOne(() => CustomerData, (customerData) => customerData.user, { cascade: true })
  @JoinColumn()
  customerData: CustomerData;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user, { cascade: true, eager: true  })
  refreshTokens: RefreshToken[];


  @OneToMany(() => UserRole, (userRole) => userRole.user)
  userRoles: UserRole[];
}