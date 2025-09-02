import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity()
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @Column()
  token: string;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  dateCreatedUtc: Date;

  @Column({ type: 'timestamp' })
  dateExpiresUtc: Date;

  @ManyToOne(() => User, (user) => user.refreshTokens)
  user: User;

  get isExpired(): boolean {
    return new Date() >= this.dateExpiresUtc;
  }
}