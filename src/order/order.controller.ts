// src/order/order.controller.ts
import { Controller, Post, Get, Body, UseGuards, Req, Param, HttpStatus, Res, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../shared/entities/order.entity';
import { OrderItem } from '../shared/entities/order-item.entity';
import { CartItem } from '../shared/entities/cart-item.entity';
import { Package } from '../shared/entities/package.entity';
import { Request } from 'express';
import { User } from 'src/shared/entities/user.entity';
import { ResponseUtil } from '../shared/utils/response.util';

@Controller('order')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Order) private orderRepo: Repository<Order>,
    @InjectRepository(OrderItem) private orderItemRepo: Repository<OrderItem>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
  ) {}

  private async getCurrentUserAsync(req: Request): Promise<User> {
    const user = await this.userRepo.findOne({
      where: { id: req.user['userId'] },
      relations: ['customerData', 'customerData.cart'],
    });
    
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    
    return user;
  }

  @Post('cart-checkout')
  async cartCheckout(@Body() selectedCartItemsId: number[], @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);
    if (!user.customerData) {
      throw new UnauthorizedException('Customer data not found');
    }

    const selectedCartItems = user.customerData.cart.filter(item => selectedCartItemsId.includes(item.cartItemId));
    if (selectedCartItems.length === 0) {
      throw new BadRequestException('No items selected for checkout.');
    }

    const order = this.orderRepo.create({
      customerId: user.id,
      orderDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
      orderItems: [],
      totalAmount: 0,
      isPaid: true,
      isShipped: false,
    });

    for (const item of selectedCartItems) {
      const product = await this.packageRepo.findOne({
        where: { packageId: item.productId },
        relations: ['packageData', 'packageData.packageImages'],
      });
      if (!product) continue;

      const orderItem = this.orderItemRepo.create({
        productId: item.productId,
        productName: product.packageName,
        productImage: product.packageData?.packageImages[0]?.filebytes,
        quantity: item.quantity,
        perUnitPrice: product.price,
        totalPrice: item.quantity * product.price,
      });
      order.orderItems.push(orderItem);
      order.totalAmount += orderItem.totalPrice;
    }

    await this.orderRepo.save(order);

    for (const cartItemId of selectedCartItemsId) {
      await this.removeFromCart(cartItemId, user);
    }

    return res.status(HttpStatus.OK).json(ResponseUtil.successWithData('Order placed successfully', 'Order placed successfully.', { orderId: order.orderId }));
  }

  @Post('single-checkout')
  async singleCheckout(@Body() body: { packageId: number }, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const product = await this.packageRepo.findOne({
      where: { packageId: body.packageId },
      relations: ['packageData', 'packageData.packageImages'],
    });
    
    if (!product) {
      throw new NotFoundException('Package not found.');
    }

    const order = this.orderRepo.create({
      customerId: user.id,
      orderDate: new Date(Date.now() + 6 * 60 * 60 * 1000),
      orderItems: [
        this.orderItemRepo.create({
          productId: body.packageId,
          productName: product.packageName,
          productImage: product.packageData?.packageImages[0]?.filebytes,
          quantity: 1,
          perUnitPrice: product.price,
          totalPrice: product.price,
        }),
      ],
      totalAmount: product.price,
      isPaid: true,
      isShipped: false,
    });

    await this.orderRepo.save(order);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successWithData('Order placed successfully', 'Order placed successfully.', { orderId: order.orderId }));
  }

  @Get('order-details/:orderId')
  async orderDetails(@Param('orderId') orderId: number, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const order = await this.orderRepo.findOne({
      where: { orderId, customerId: user.id },
      relations: ['orderItems'],
    });
    
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const orderDetails = {
      orderId: order.orderId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      isShipped: order.isShipped,
      shippingDate: order.shippingDate,
      orderItems: order.orderItems.map(oi => ({
        productId: oi.productId,
        productName: oi.productName,
        productImage: oi.productImage,
        quantity: oi.quantity,
        perUnitPrice: oi.perUnitPrice,
        totalPrice: oi.totalPrice,
      })),
    };
    
    return res.status(HttpStatus.OK).json(orderDetails);
  }

  @Post('order-history')
  async orderHistory(@Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const orders = await this.orderRepo.find({
      where: { customerId: user.id },
      relations: ['orderItems'],
    });
    
    const orderHistory = orders.map(order => ({
      orderId: order.orderId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      isShipped: order.isShipped,
      shippingDate: order.shippingDate,
      orderItems: order.orderItems.map(oi => ({
        productId: oi.productId,
        productName: oi.productName,
        productImage: oi.productImage,
        quantity: oi.quantity,
        perUnitPrice: oi.perUnitPrice,
        totalPrice: oi.totalPrice,
      })),
    }));
    
    return res.status(HttpStatus.OK).json(orderHistory);
  }

  private async removeFromCart(cartItemId: number, user: User) {
    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId, customerDataId: user.customerData.customerDataId },
    });
    
    if (cartItem) {
      await this.cartItemRepo.remove(cartItem);
    }
  }
}