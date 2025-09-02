// ------------------------------------------------
// src/admin/admin.module.ts
// ------------------------------------------------
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { UserService } from '../shared/services/user.service';
import { Role } from '../shared/entities/role.entity';
import { UserRole } from '../shared/entities/user-role.entity';
import { User } from 'src/shared/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, UserRole])],
  controllers: [AdminController],
  providers: [UserService],
})
export class AdminModule {}