// ------------------------------------------------
// src/account/account.module.ts
// ------------------------------------------------
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountController } from './account.controller';
import { JwtService } from '../shared/services/jwt.service';
import { EmailService } from '../shared/services/email.service';
import { UserService } from '../shared/services/user.service';
import { RefreshToken } from '../shared/entities/refresh-token.entity';
import { Role } from '../shared/entities/role.entity';
import { UserRole } from '../shared/entities/user-role.entity';
import { User } from 'src/shared/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, RefreshToken, Role, UserRole])],
  controllers: [AccountController],
  providers: [JwtService, EmailService, UserService],
})
export class AccountModule {}