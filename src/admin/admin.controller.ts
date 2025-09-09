import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpStatus, Res } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { MemberAddEditDto } from '../shared/dtos/member-add-edit.dto';
import { MemberViewDto } from '../shared/dtos/member-view.dto';
import { UserService } from '../shared/services/user.service';
import { Response } from 'express';
import * as bcrypt from 'bcrypt';
import { User } from '../shared/entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../shared/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {}

  @Get('get-members')
  async getMembers(): Promise<MemberViewDto[]> {
    const members = await this.userService.findAllAsync({
      where: { userName: Not('novel4004@gmail.com') },
      relations: ['userRoles', 'userRoles.role'],
    });
    const memberDtos = await Promise.all(
      members.map(async (member) => ({
        id: member.id,
        userName: member.userName,
        firstName: member.firstName,
        lastName: member.lastName,
        dateCreated: member.dateCreated,
        isEmailConfirmed: member.emailConfirmed,
        isLocked: await this.userService.isLockedOutAsync(member),
        roles: member.userRoles.map(ur => ur.role.name),
      }))
    );
    return memberDtos;
  }

  @Get('get-member/:id')
  async getMember(@Param('id') id: string): Promise<MemberAddEditDto> {
    const member = await this.userService.findOneAsync({
      where: { id, userName: Not('novel4004@gmail.com') },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!member) throw new Error('Member not found');
    return {
      id: member.id,
      userName: member.userName,
      firstName: member.firstName,
      lastName: member.lastName,
      password: null,
      roles: member.userRoles.map(ur => ur.role.name).join(','),
    };
  }

  // src/admin/admin.controller.ts
  @Post('add-edit-member')
  async addEditMember(@Body() model: MemberAddEditDto, @Res() res: Response) {
    let user: User;

    if (!model.id) {
      // Adding new member - Admin দ্বারা add করছে
      if (!model.password || model.password.length < 6) {
        res.status(HttpStatus.BAD_REQUEST).json('Password must be at least 6 characters');
        return;
      }
      
      // Admin দ্বারা user create করলে email confirmed=true দিয়ে create করুন
      user = await this.userService.createAsync({
        firstName: model.firstName.toLowerCase(),
        lastName: model.lastName.toLowerCase(),
        email: model.userName.toLowerCase(),
        password: model.password,
      }, true); // দ্বিতীয় parameter true pass করুন
      
      res.json({ title: 'Member Created', message: `${model.userName} has been created` });
    } else {
      // Editing existing member
      if (model.password && model.password.length < 6) {
        res.status(HttpStatus.BAD_REQUEST).json('Password must be at least 6 characters');
        return;
      }
      if (await this.isAdminUserId(model.id)) {
        res.status(HttpStatus.BAD_REQUEST).json('Super Admin change is not allowed');
        return;
      }
      
      user = await this.userService.findByIdAsync(model.id);
      if (!user) throw new Error('User not found');
      
      user.firstName = model.firstName.toLowerCase();
      user.lastName = model.lastName.toLowerCase();
      user.userName = model.userName.toLowerCase();
      
      if (model.password) {
        user.passwordHash = await bcrypt.hash(model.password, 10);
      }
      
      await this.userService.updateAsync(user);
      res.json({ title: 'Member Edited', message: `${model.userName} has been updated` });
    }

    // Roles management
    const userRoles = await this.userService.getRolesAsync(user);
    await this.userService.removeFromRolesAsync(user, userRoles);

    for (const role of model.roles.split(',')) {
      await this.userService.addToRoleAsync(user, role.trim());
    }
  }

  @Put('lock-member/:id')
  async lockMember(@Param('id') id: string) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new Error('User not found');
    if (await this.isAdminUserId(id)) throw new Error('Super Admin change is not allowed');
    
    // 24 ঘন্টার জন্য lockout
    user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.lockoutEnabled = true;
    await this.userService.updateAsync(user);
    
    return { message: 'User locked successfully' };
  }

  @Put('unlock-member/:id')
  async unlockMember(@Param('id') id: string) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new Error('User not found');
    if (await this.isAdminUserId(id)) throw new Error('Super Admin change is not allowed');
    
    user.lockoutEnd = null;
    user.lockoutEnabled = false;
    user.accessFailedCount = 0;
    await this.userService.updateAsync(user);
    
    return { message: 'User unlocked successfully' };
  }

  @Put('unConfirmEmail/:id')
  async unConfirmEmail(@Param('id') id: string) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new Error('User not found');
    if (await this.isAdminUserId(id)) throw new Error('Super Admin change is not allowed');
    user.emailConfirmed = false;
    await this.userService.updateAsync(user);
  }

  @Put('confirmEmail/:id')
  async confirmEmail(@Param('id') id: string) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new Error('User not found');
    if (await this.isAdminUserId(id)) throw new Error('Super Admin change is not allowed');
    user.emailConfirmed = true;
    await this.userService.updateAsync(user);
  }

  @Delete('delete-member/:id')
  async deleteMember(@Param('id') id: string) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new Error('User not found');
    if (await this.isAdminUserId(id)) throw new Error('Super Admin change is not allowed');
    await this.userService.deleteAsync(user);
  }

  @Get('get-application-roles')
  async getApplicationRoles(): Promise<string[]> {
    const roles = await this.roleRepository.find();
    return roles.map(r => r.name);
  }

  private async isAdminUserId(userId: string): Promise<boolean> {
    const admin = await this.userService.findByIdAsync(userId);
    return admin?.userName === 'novel4004@gmail.com';
  }
}