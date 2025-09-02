// src/shared/services/user.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dtos/register.dto';
import { User } from '../entities/user.entity';
import { Logger } from '@nestjs/common'; // অ্যাড

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name); // লগ অ্যাড

  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async createAsync(registerDto: RegisterDto): Promise<User> {
    this.logger.log(`createAsync: Creating user for email: ${registerDto.email}`);
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      firstName: registerDto.firstName.toLowerCase(),
      lastName: registerDto.lastName.toLowerCase(),
      userName: registerDto.email.toLowerCase(),
      email: registerDto.email.toLowerCase(),
      passwordHash: hashedPassword,
      emailConfirmed: false,
    });
    await this.userRepository.save(user);
    this.logger.log(`createAsync: User created with ID: ${user.id}`);
    return user;
  }

  async findByNameAsync(userName: string): Promise<User> {
    this.logger.log(`findByNameAsync: Searching for userName: ${userName}`);
    const user = await this.userRepository.findOne({
      where: { userName: userName.toLowerCase() },
      relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
    });
    if (user) {
      this.logger.log(`findByNameAsync: User found with ID: ${user.id}`);
    } else {
      this.logger.warn(`findByNameAsync: User not found for userName: ${userName}`);
    }
    return user;
  }

  async findByIdAsync(id: string): Promise<User> {
    this.logger.log(`findByIdAsync: Searching for ID: ${id}`);
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
    });
    if (user) {
      this.logger.log(`findByIdAsync: User found with ID: ${id}`);
    } else {
      this.logger.warn(`findByIdAsync: User not found for ID: ${id}`);
    }
    return user;
  }

  async findByEmailAsync(email: string): Promise<User> {
    this.logger.log(`findByEmailAsync: Searching for email: ${email}`);
    const user = await this.userRepository.findOne({
      where: { email: email.toLowerCase() },
      relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
    });
    if (user) {
      this.logger.log(`findByEmailAsync: User found with ID: ${user.id}`);
    } else {
      this.logger.warn(`findByEmailAsync: User not found for email: ${email}`);
    }
    return user;
  }

  async checkPasswordSignInAsync(user: User, password: string): Promise<{ succeeded: boolean; isLockedOut: boolean }> {
    this.logger.log(`checkPasswordSignInAsync: Checking password for user ID: ${user.id}`);
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      this.logger.warn(`checkPasswordSignInAsync: Password mismatch for user ID: ${user.id}`);
      user.accessFailedCount++;
      if (user.accessFailedCount >= 3) {
        user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day lockout
        user.lockoutEnabled = true;
        this.logger.log(`checkPasswordSignInAsync: User locked out - ID: ${user.id}`);
      }
      await this.userRepository.save(user);
      return { succeeded: false, isLockedOut: user.lockoutEnabled };
    }
    user.accessFailedCount = 0;
    user.lockoutEnd = null;
    user.lockoutEnabled = false;
    await this.userRepository.save(user);
    this.logger.log(`checkPasswordSignInAsync: Password match successful for user ID: ${user.id}`);
    return { succeeded: true, isLockedOut: false };
  }

  async addToRoleAsync(user: User, roleName: string): Promise<void> {
    this.logger.log(`addToRoleAsync: Adding role ${roleName} to user ID: ${user.id}`);
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (role) {
      const userRole = this.userRoleRepository.create({ userId: user.id, roleId: role.id });
      await this.userRoleRepository.save(userRole);
      this.logger.log(`addToRoleAsync: Role added successfully.`);
    } else {
      this.logger.warn(`addToRoleAsync: Role ${roleName} not found.`);
    }
  }

  async getRolesAsync(user: User): Promise<string[]> {
    this.logger.log(`getRolesAsync: Fetching roles for user ID: ${user.id}`);
    const userRoles = await this.userRoleRepository.find({ where: { userId: user.id }, relations: ['role'] });
    const roles = userRoles.map(ur => ur.role.name);
    this.logger.log(`getRolesAsync: Roles fetched: ${roles.join(', ')}`);
    return roles;
  }

  async removeFromRolesAsync(user: User, roles: string[]): Promise<void> {
    this.logger.log(`removeFromRolesAsync: Removing roles ${roles.join(', ')} from user ID: ${user.id}`);
    for (const role of roles) {
      const roleEntity = await this.roleRepository.findOne({ where: { name: role } });
      if (roleEntity) {
        await this.userRoleRepository.delete({ userId: user.id, roleId: roleEntity.id });
        this.logger.log(`removeFromRolesAsync: Removed role ${role}`);
      }
    }
  }

  async isLockedOutAsync(user: User): Promise<boolean> {
    const isLocked = user.lockoutEnabled && user.lockoutEnd > new Date();
    this.logger.log(`isLockedOutAsync: User ID ${user.id} locked: ${isLocked}`);
    return isLocked;
  }

  async confirmEmailAsync(user: User, token: string): Promise<boolean> {
    this.logger.log(`confirmEmailAsync: Confirming email for user ID: ${user.id} with token: ${token}`);
    // In ASP.NET, token is generated and validated, here simple for now (add proper token validation if needed)
    user.emailConfirmed = true;
    await this.userRepository.save(user);
    this.logger.log(`confirmEmailAsync: Email confirmed successfully.`);
    return true;
  }

  async generateEmailConfirmationTokenAsync(user: User): Promise<string> {
    this.logger.log(`generateEmailConfirmationTokenAsync: Generating token for user ID: ${user.id}`);
    const token = Buffer.from(user.email).toString('base64url'); // Simple token, match ASP.NET logic
    this.logger.log(`generateEmailConfirmationTokenAsync: Token generated.`);
    return token;
  }

  async generatePasswordResetTokenAsync(user: User): Promise<string> {
    this.logger.log(`generatePasswordResetTokenAsync: Generating reset token for user ID: ${user.id}`);
    const token = Buffer.from(user.email + Date.now().toString()).toString('base64url');
    this.logger.log(`generatePasswordResetTokenAsync: Token generated.`);
    return token;
  }

  async resetPasswordAsync(user: User, token: string, newPassword: string): Promise<boolean> {
    this.logger.log(`resetPasswordAsync: Resetting password for user ID: ${user.id} with token: ${token}`);
    // Validate token (simple)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);
    this.logger.log(`resetPasswordAsync: Password reset successful.`);
    return true;
  }

  async updateAsync(user: User): Promise<void> {
    this.logger.log(`updateAsync: Updating user ID: ${user.id}`);
    await this.userRepository.save(user);
    this.logger.log(`updateAsync: Update successful.`);
  }

  async deleteAsync(user: User): Promise<void> {
    this.logger.log(`deleteAsync: Deleting user ID: ${user.id}`);
    await this.userRepository.remove(user);
    this.logger.log(`deleteAsync: Deletion successful.`);
  }

  async usersAnyAsync(predicate: Partial<User>): Promise<boolean> {
    this.logger.log(`usersAnyAsync: Checking if user exists with predicate: ${JSON.stringify(predicate)}`);
    const count = await this.userRepository.count({ where: predicate });
    const exists = count > 0;
    this.logger.log(`usersAnyAsync: Exists: ${exists}`);
    return exists;
  }

  async findAllAsync(options: any): Promise<User[]> {
    this.logger.log(`findAllAsync: Finding all users with options: ${JSON.stringify(options)}`);
    const users = await this.userRepository.find(options);
    this.logger.log(`findAllAsync: Found ${users.length} users.`);
    return users;
  }

  async findOneAsync(options: any): Promise<User | null> {
    this.logger.log(`findOneAsync: Finding one user with options: ${JSON.stringify(options)}`);
    const user = await this.userRepository.findOne(options);
    if (user) {
      this.logger.log(`findOneAsync: User found with ID: ${user.id}`);
    } else {
      this.logger.warn(`findOneAsync: User not found.`);
    }
    return user;
  }
}