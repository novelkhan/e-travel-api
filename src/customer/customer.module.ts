// ------------------------------------------------
// src/customer/customer.module.ts
// ------------------------------------------------
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { UserService } from '../shared/services/user.service';
import { User } from '../shared/entities/user.entity';
import { Role } from '../shared/entities/role.entity';
import { UserRole } from '../shared/entities/user-role.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole])], // Add Role and UserRole
  controllers: [CustomerController],
  providers: [UserService],
})
export class CustomerModule {}