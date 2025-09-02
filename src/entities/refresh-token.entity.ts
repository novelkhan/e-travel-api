import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';
import { IsNotEmpty, MaxLength } from 'class-validator';

@Entity('RefreshTokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: 'UserId is required' })
  userId: string;

  @Column({ length: 100 })
  @IsNotEmpty({ message: 'Token is required' })
  @MaxLength(100, { message: 'Token must not exceed 100 characters' })
  token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreatedUtc: Date;

  @Column({ type: 'timestamp' })
  dateExpiresUtc: Date;

  get isExpired(): boolean {
    return new Date() >= this.dateExpiresUtc;
  }

  @ManyToOne(() => User, (user) => user.refreshTokens)
  user: User;
}