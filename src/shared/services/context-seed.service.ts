// ------------------------------------------------
// src/shared/services/context-seed.service.ts (ContextSeedService)
// ------------------------------------------------
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';

@Injectable()
export class ContextSeedService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
  ) {}

  async initializeContext(): Promise<void> {
    // Seed roles if none exist
    const roles = await this.roleRepository.find();
    if (roles.length === 0) {
      await this.roleRepository.save({ name: 'Admin' });
      await this.roleRepository.save({ name: 'Manager' });
      await this.roleRepository.save({ name: 'Customer' });
    }

    // Seed admin user if none exist
    const users = await this.userRepository.find();
    if (users.length === 0) {
      const adminRole = await this.roleRepository.findOne({ where: { name: 'Admin' } });
      const managerRole = await this.roleRepository.findOne({ where: { name: 'Manager' } });
      const customerRole = await this.roleRepository.findOne({ where: { name: 'Customer' } });

      const admin = this.userRepository.create({
        firstName: 'Novel',
        lastName: 'Khan',
        userName: 'novel4004@gmail.com',
        email: 'novel4004@gmail.com',
        emailConfirmed: true,
        passwordHash: await bcrypt.hash('123456', 10),
      });
      await this.userRepository.save(admin);

      await this.userRoleRepository.save({ userId: admin.id, roleId: adminRole.id });
      await this.userRoleRepository.save({ userId: admin.id, roleId: managerRole.id });
      await this.userRoleRepository.save({ userId: admin.id, roleId: customerRole.id });
    }
  }
}