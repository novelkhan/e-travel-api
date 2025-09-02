// ------------------------------------------------
// src/shared/services/user.service.ts (UserService / UserManager equivalent)
// ------------------------------------------------
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../entities/role.entity';
import { UserRole } from '../entities/user-role.entity';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from '../dtos/register.dto';
import { User } from '../entities/user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
    @InjectRepository(UserRole) private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  async createAsync(registerDto: RegisterDto): Promise<User> {
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
    return user;
  }

  // src/shared/services/user.service.ts
async findByNameAsync(userName: string): Promise<User> {
  return this.userRepository.findOne({
    where: { userName: userName.toLowerCase() },
    relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
  });
}

async findByIdAsync(id: string): Promise<User> {
  return this.userRepository.findOne({
    where: { id },
    relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
  });
}

async findByEmailAsync(email: string): Promise<User> {
  return this.userRepository.findOne({
    where: { email: email.toLowerCase() },
    relations: ['userRoles', 'userRoles.role', 'refreshTokens'],  // refreshTokens অ্যাড করো
  });
}

  async checkPasswordSignInAsync(user: User, password: string): Promise<{ succeeded: boolean; isLockedOut: boolean }> {
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      user.accessFailedCount++;
      if (user.accessFailedCount >= 3) {
        user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day lockout
        user.lockoutEnabled = true;
      }
      await this.userRepository.save(user);
      return { succeeded: false, isLockedOut: user.lockoutEnabled };
    }
    user.accessFailedCount = 0;
    user.lockoutEnd = null;
    user.lockoutEnabled = false;
    await this.userRepository.save(user);
    return { succeeded: true, isLockedOut: false };
  }

  async addToRoleAsync(user: User, roleName: string): Promise<void> {
    const role = await this.roleRepository.findOne({ where: { name: roleName } });
    if (role) {
      const userRole = this.userRoleRepository.create({ userId: user.id, roleId: role.id });
      await this.userRoleRepository.save(userRole);
    }
  }

  async getRolesAsync(user: User): Promise<string[]> {
    const userRoles = await this.userRoleRepository.find({ where: { userId: user.id }, relations: ['role'] });
    return userRoles.map(ur => ur.role.name);
  }

  async removeFromRolesAsync(user: User, roles: string[]): Promise<void> {
    for (const role of roles) {
      const roleEntity = await this.roleRepository.findOne({ where: { name: role } });
      if (roleEntity) {
        await this.userRoleRepository.delete({ userId: user.id, roleId: roleEntity.id });
      }
    }
  }

  async isLockedOutAsync(user: User): Promise<boolean> {
    return user.lockoutEnabled && user.lockoutEnd > new Date();
  }

  async confirmEmailAsync(user: User, token: string): Promise<boolean> {
    // In ASP.NET, token is generated and validated, here simple for now (add proper token validation if needed)
    user.emailConfirmed = true;
    await this.userRepository.save(user);
    return true;
  }

  async generateEmailConfirmationTokenAsync(user: User): Promise<string> {
    return Buffer.from(user.email).toString('base64url'); // Simple token, match ASP.NET logic
  }

  async generatePasswordResetTokenAsync(user: User): Promise<string> {
    return Buffer.from(user.email + Date.now().toString()).toString('base64url');
  }

  async resetPasswordAsync(user: User, token: string, newPassword: string): Promise<boolean> {
    // Validate token (simple)
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    await this.userRepository.save(user);
    return true;
  }

  async updateAsync(user: User): Promise<void> {
    await this.userRepository.save(user);
  }

  async deleteAsync(user: User): Promise<void> {
    await this.userRepository.remove(user);
  }

  async usersAnyAsync(predicate: Partial<User>): Promise<boolean> {
    return (await this.userRepository.count({ where: predicate })) > 0;
  }

  async findAllAsync(options: any): Promise<User[]> {
  return this.userRepository.find(options);
}

async findOneAsync(options: any): Promise<User | null> {
  return this.userRepository.findOne(options);
}
}