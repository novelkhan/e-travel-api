import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { UserRole } from './user-role.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // যেমন: "Admin", "Player", "Manager"

  @OneToMany(() => UserRole, (userRole) => userRole.role)
  userRoles: UserRole[]; // এই লাইন যোগ করুন
}