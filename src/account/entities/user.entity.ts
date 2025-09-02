import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { RefreshToken } from './refresh-token.entity';
import { CustomerData } from './customer-data.entity';

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ unique: true })
  userName: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column({ default: false })
  emailConfirmed: boolean;

  @Column({ default: 0 })
  accessFailedCount: number;

  @Column({ type: 'timestamp', nullable: true })
  lockoutEnd: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreated: Date;

  @OneToMany(() => RefreshToken, (refreshToken) => refreshToken.user)
  refreshTokens: RefreshToken[];

  @OneToMany(() => CustomerData, (customerData) => customerData.user)
  customerData: CustomerData;
}