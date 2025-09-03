// src/shared/services/context-seed.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
import { User } from '../entities/user.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class ContextSeedService {
  private readonly logger = new Logger(ContextSeedService.name);

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
    private readonly configService: ConfigService,
  ) {}

  async initializeContext(): Promise<void> {
    this.logger.log('initializeContext: Checking roles...');
    const roles = await this.roleRepository.find();
    if (roles.length === 0) {
      this.logger.log('initializeContext: Seeding roles...');
      await this.roleRepository.save({ name: 'Admin' });
      await this.roleRepository.save({ name: 'Manager' });
      await this.roleRepository.save({ name: 'Customer' });
      await this.roleRepository.save({ name: 'Player' }); // Player রোল যোগ করা
      this.logger.log('initializeContext: Roles seeded successfully.');
    } else {
      this.logger.log('initializeContext: Roles already exist, skipping seeding.');
    }

    this.logger.log('initializeContext: Checking users...');
    const users = await this.userRepository.find();
    if (users.length === 0) {
      this.logger.log('initializeContext: Seeding admin user...');
      const adminRole = await this.roleRepository.findOne({ where: { name: 'Admin' } });
      const managerRole = await this.roleRepository.findOne({ where: { name: 'Manager' } });
      const customerRole = await this.roleRepository.findOne({ where: { name: 'Customer' } });
      const playerRole = await this.roleRepository.findOne({ where: { name: 'Player' } }); // Player রোল

      const admin = this.userRepository.create({
        firstName: 'Novel',
        lastName: 'Khan',
        userName: 'novel4004@gmail.com',
        email: 'novel4004@gmail.com',
        emailConfirmed: true,
        passwordHash: await bcrypt.hash('123456', 10),
      });
      await this.userRepository.save(admin);
      this.logger.log(`initializeContext: Admin user created with ID: ${admin.id}`);

      await this.userRoleRepository.save({ userId: admin.id, roleId: adminRole.id });
      //await this.userRoleRepository.save({ userId: admin.id, roleId: managerRole.id });
      //await this.userRoleRepository.save({ userId: admin.id, roleId: customerRole.id });
      //await this.userRoleRepository.save({ userId: admin.id, roleId: playerRole.id }); // Player রোল অ্যাসাইন
      this.logger.log('initializeContext: Admin roles assigned.');
    } else {
      this.logger.log('initializeContext: Users already exist, skipping seeding.');
    }
  }
}