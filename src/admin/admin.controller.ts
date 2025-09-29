// src/admin/admin.controller.ts
import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards, HttpStatus, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { MemberAddEditDto } from '../shared/dtos/member-add-edit.dto';
import { MemberViewDto } from '../shared/dtos/member-view.dto';
import { UserService } from '../shared/services/user.service';
import * as bcrypt from 'bcrypt';
import { User } from '../shared/entities/user.entity';
import { Repository } from 'typeorm';
import { Role } from '../shared/entities/role.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Not } from 'typeorm';
import { ResponseUtil } from '../shared/utils/response.util'; // নতুন যোগ করুন

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('Admin')
export class AdminController {
  constructor(
    private readonly userService: UserService,
    @InjectRepository(Role) private readonly roleRepository: Repository<Role>,
  ) {}

  @Get('get-members')
  async getMembers(@Res() res: Response) {
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
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successData(memberDtos));
  }

  @Get('get-member/:id')
  async getMember(@Param('id') id: string, @Res() res: Response) {
    const member = await this.userService.findOneAsync({
      where: { id, userName: Not('novel4004@gmail.com') },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!member) throw new NotFoundException('Member not found');
    
    const memberDto: MemberAddEditDto = {
      id: member.id,
      userName: member.userName,
      firstName: member.firstName,
      lastName: member.lastName,
      password: null,
      roles: member.userRoles.map(ur => ur.role.name).join(','),
    };
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successData(memberDto));
  }

  @Post('add-edit-member')
  async addEditMember(@Body() model: MemberAddEditDto, @Res() res: Response) {
    let user: User;

    if (!model.id) {
      if (!model.password || model.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }

      user = await this.userService.createAsync({
        firstName: model.firstName.toLowerCase(),
        lastName: model.lastName.toLowerCase(),
        email: model.userName.toLowerCase(),
        password: model.password,
      }, true);
    } else {
      if (model.password && model.password.length < 6) {
        throw new BadRequestException('Password must be at least 6 characters');
      }
      
      if (await this.isAdminUserId(model.id)) {
        throw new BadRequestException('Super Admin change is not allowed!');
      }
      
      user = await this.userService.findByIdAsync(model.id);
      if (!user) throw new NotFoundException('User not found');
      
      user.firstName = model.firstName.toLowerCase();
      user.lastName = model.lastName.toLowerCase();
      user.userName = model.userName.toLowerCase();
      
      if (model.password) {
        user.passwordHash = await bcrypt.hash(model.password, 10);
      }
      
      await this.userService.updateAsync(user);
    }

    const userRoles = await this.userService.getRolesAsync(user);
    await this.userService.removeFromRolesAsync(user, userRoles);

    for (const role of model.roles.split(',')) {
      await this.userService.addToRoleAsync(user, role.trim());
    }

    if (!model.id) {
      return res.status(HttpStatus.OK).json(ResponseUtil.success('Member Created', `${model.userName} has been created`));
    } else {
      return res.status(HttpStatus.OK).json(ResponseUtil.success('Member Edited', `${model.userName} has been updated`));
    }
  }

  @Put('lock-member/:id')
  async lockMember(@Param('id') id: string, @Res() res: Response) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new NotFoundException('User not found');
    
    if (await this.isAdminUserId(id)) {
      throw new BadRequestException('Super Admin change is not allowed!');
    }
    
    user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
    user.lockoutEnabled = true;
    await this.userService.updateAsync(user);
    
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Put('unlock-member/:id')
  async unlockMember(@Param('id') id: string, @Res() res: Response) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new NotFoundException('User not found');
    
    if (await this.isAdminUserId(id)) {
      throw new BadRequestException('Super Admin change is not allowed!');
    }
    
    user.lockoutEnd = null;
    user.lockoutEnabled = false;
    user.accessFailedCount = 0;
    await this.userService.updateAsync(user);
    
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Put('unConfirmEmail/:id')
  async unConfirmEmail(@Param('id') id: string, @Res() res: Response) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new NotFoundException('User not found');
    
    if (await this.isAdminUserId(id)) {
      throw new BadRequestException('Super Admin change is not allowed!');
    }
    
    user.emailConfirmed = false;
    await this.userService.updateAsync(user);
    
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Put('confirmEmail/:id')
  async confirmEmail(@Param('id') id: string, @Res() res: Response) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new NotFoundException('User not found');
    
    if (await this.isAdminUserId(id)) {
      throw new BadRequestException('Super Admin change is not allowed!');
    }
    
    user.emailConfirmed = true;
    await this.userService.updateAsync(user);
    
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Delete('delete-member/:id')
  async deleteMember(@Param('id') id: string, @Res() res: Response) {
    const user = await this.userService.findByIdAsync(id);
    if (!user) throw new NotFoundException('User not found');
    
    if (await this.isAdminUserId(id)) {
      throw new BadRequestException('Super Admin change is not allowed!');
    }
    
    await this.userService.deleteAsync(user);
    
    return res.status(HttpStatus.NO_CONTENT).send();
  }

  @Get('get-application-roles')
  async getApplicationRoles(@Res() res: Response) {
    const roles = await this.roleRepository.find();
    const roleNames = roles.map(r => r.name);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successData(roleNames));
  }

  private async isAdminUserId(userId: string): Promise<boolean> {
    const admin = await this.userService.findByIdAsync(userId);
    return admin?.userName === 'novel4004@gmail.com';
  }
}