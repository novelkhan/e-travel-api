// ------------------------------------------------
// src/customer/customer.controller.ts
// ------------------------------------------------
import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { UserService } from '../shared/services/user.service';

@Controller('customer')
@UseGuards(JwtAuthGuard)
export class CustomerController {
  constructor(private readonly userService: UserService) {}

  @Get('get-customers')
  getCustomers() {
    return { message: 'Only authorized users can view this action method' };
  }

  // Other methods are private helpers, not endpoints
}