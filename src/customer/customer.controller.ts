// src/customer/customer.controller.ts
import { Controller, Get, UseGuards, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { UserService } from '../shared/services/user.service';
import { ResponseUtil } from '../shared/utils/response.util'; // নতুন যোগ করুন

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly userService: UserService) {}

  @Get('get-customers')
  getCustomers(@Res() res: Response) {
    return res.status(HttpStatus.OK).json(ResponseUtil.successMessage('Only authorized users can view this action method'));
  }
}