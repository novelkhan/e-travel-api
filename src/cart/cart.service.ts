import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../entities/cart-item.entity';
import { CustomerData } from '../entities/customer-data.entity';
import { Package } from '../entities/package.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(CustomerData)
    private customerDataRepository: Repository<CustomerData>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
  ) {}

  async getCart(user: any): Promise<any> {
    const customerData = await this.customerDataRepository.findOne({
      where: { userId: user.userId },
      relations: ['cart'],
    });

    if (!customerData) {
      return { items: [] };
    }

    const cartItems = await this.cartItemRepository.find({
      where: { customerDataId: customerData.customerDataId },
      relations: ['customerData'],
    });

    return {
      items: cartItems.map(item => ({
        cartItemId: item.cartItemId,
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
  }

  async addToCart(productId: number, quantity: number, user: any): Promise<any> {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than zero');
    }

    const pkg = await this.packageRepository.findOneBy({ packageId: productId });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    let customerData = await this.customerDataRepository.findOneBy({ userId: user.userId });
    if (!customerData) {
      customerData = this.customerDataRepository.create({ userId: user.userId });
      await this.customerDataRepository.save(customerData);
    }

    const existingItem = await this.cartItemRepository.findOne({
      where: { customerDataId: customerData.customerDataId, productId },
    });

    if (existingItem) {
      existingItem.quantity += quantity;
      await this.cartItemRepository.save(existingItem);
    } else {
      const cartItem = this.cartItemRepository.create({
        customerDataId: customerData.customerDataId,
        productId,
        quantity,
      });
      await this.cartItemRepository.save(cartItem);
    }

    return { title: 'Item Added', message: 'Item has been added to cart' };
  }

  async removeFromCart(cartItemId: number, user: any): Promise<any> {
    const customerData = await this.customerDataRepository.findOneBy({ userId: user.userId });
    if (!customerData) {
      throw new NotFoundException('Cart not found');
    }

    const cartItem = await this.cartItemRepository.findOneBy({
      cartItemId,
      customerDataId: customerData.customerDataId,
    });

    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepository.delete(cartItemId);
    return { title: 'Item Removed', message: 'Item has been removed from cart' };
  }
}