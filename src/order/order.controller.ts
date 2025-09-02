import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('order')
@Controller('api/order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get()
  async getOrders(@Request() req) {
    return this.orderService.getOrders(req.user);
  }

  @Post('create')
  async createOrder(@Request() req) {
    return this.orderService.createOrder(req.user);
  }
}