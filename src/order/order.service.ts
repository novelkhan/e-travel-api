import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Package } from '../entities/package.entity';
import { CustomerData } from '../entities/customer-data.entity';

@Injectable()
export class OrderService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(CustomerData)
    private customerDataRepository: Repository<CustomerData>,
  ) {}

  async getOrders(user: any): Promise<any> {
    const orders = await this.orderRepository.find({
      where: { customerId: user.userId },
      relations: ['orderItems'],
    });

    return orders.map(order => ({
      orderId: order.orderId,
      customerId: order.customerId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      isShipped: order.isShipped,
      shippingDate: order.shippingDate,
      orderItems: order.orderItems.map(item => ({
        orderItemId: item.orderItemId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        perUnitPrice: item.perUnitPrice,
        totalPrice: item.totalPrice,
      })),
    }));
  }

  async createOrder(user: any): Promise<any> {
    const customerData = await this.customerDataRepository.findOne({
      where: { userId: user.userId },
      relations: ['cart'],
    });

    if (!customerData || !customerData.cart || customerData.cart.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    let totalAmount = 0;
    const orderItems: OrderItem[] = [];

    for (const cartItem of customerData.cart) {
      const pkg = await this.packageRepository.findOneBy({ packageId: cartItem.productId });
      if (!pkg) {
        throw new NotFoundException(`Package with ID ${cartItem.productId} not found`);
      }

      const orderItem = this.orderItemRepository.create({
        productId: cartItem.productId,
        productName: pkg.packageName,
        quantity: cartItem.quantity,
        perUnitPrice: pkg.price,
        totalPrice: pkg.price * cartItem.quantity,
      });

      totalAmount += orderItem.totalPrice;
      orderItems.push(orderItem);
    }

    const order = this.orderRepository.create({
      customerId: user.userId,
      orderDate: new Date(),
      totalAmount,
      isPaid: false,
      isShipped: false,
    });

    const savedOrder = await this.orderRepository.save(order);

    for (const orderItem of orderItems) {
      orderItem.orderId = savedOrder.orderId;
      await this.orderItemRepository.save(orderItem);
    }

    await this.customerDataRepository
      .createQueryBuilder()
      .delete()
      .from('cart_items')
      .where('customerDataId = :customerDataId', { customerDataId: customerData.customerDataId })
      .execute();

    return { title: 'Order Created', message: 'Order has been created successfully' };
  }
}