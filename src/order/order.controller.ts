// ------------------------------------------------
// src/order/order.controller.ts
// ------------------------------------------------
import { Controller, Post, Get, Body, UseGuards, Req, Param, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../shared/entities/order.entity';
import { OrderItem } from '../shared/entities/order-item.entity';
import { CartItem } from '../shared/entities/cart-item.entity';
import { Package } from '../shared/entities/package.entity';
import { Request } from 'express';
import { User } from 'src/shared/entities/user.entity';

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
    return this.userRepo.findOne({
      where: { id: req.user['userId'] },
      relations: ['customerData', 'customerData.cart'],
    });
  }

  @Post('cart-checkout')
  async cartCheckout(@Body() selectedCartItemsId: number[], @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user || !user.customerData) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const selectedCartItems = user.customerData.cart.filter(item => selectedCartItemsId.includes(item.cartItemId));
    if (selectedCartItems.length === 0) throw new HttpException('No items selected for checkout.', HttpStatus.BAD_REQUEST);

    const order = this.orderRepo.create({
      customerId: user.id,
      orderDate: new Date(Date.now() + 6 * 60 * 60 * 1000), // Add 6 hours
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

    return { message: 'Order placed successfully.', orderId: order.orderId };
  }

  @Post('single-checkout')
  async singleCheckout(@Body() body: { packageId: number }, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const product = await this.packageRepo.findOne({
      where: { packageId: body.packageId },
      relations: ['packageData', 'packageData.packageImages'],
    });
    if (!product) throw new HttpException('Package not found.', HttpStatus.NOT_FOUND);

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
    return { message: 'Order placed successfully.', orderId: order.orderId };
  }

  @Get('order-details/:orderId')
  async orderDetails(@Param('orderId') orderId: number, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const order = await this.orderRepo.findOne({
      where: { orderId, customerId: user.id },
      relations: ['orderItems'],
    });
    if (!order) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

    return {
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
  }

  @Post('order-history')
  async orderHistory(@Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const orders = await this.orderRepo.find({
      where: { customerId: user.id },
      relations: ['orderItems'],
    });
    return orders.map(order => ({
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
  }

  private async removeFromCart(cartItemId: number, user: User) {
    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId, customerDataId: user.customerData.customerDataId },
    });
    if (cartItem) await this.cartItemRepo.remove(cartItem);
  }
}