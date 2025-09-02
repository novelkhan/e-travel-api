import { Controller, Get, Post, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../shared/entities/cart-item.entity';
import { Package } from '../shared/entities/package.entity';
import { Request } from 'express';
import { User } from '../shared/entities/user.entity';
import { CustomerData } from '../shared/entities/customer-data.entity';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(CartItem) private cartItemRepo: Repository<CartItem>,
    @InjectRepository(Package) private packageRepo: Repository<Package>,
  ) {}

  private async getCurrentUserAsync(req: Request): Promise<User> {
    return this.userRepo.findOne({
      where: { id: req.user['userId'] },
      relations: ['customerData', 'customerData.cart'],
    });
  }

  @Get('cart-items')
  async cartItems(@Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user || !user.customerData) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const cartItems = await Promise.all(
      user.customerData.cart.map(async (item) => ({
        cartItemId: item.cartItemId,
        productName: await this.getProductName(item.productId),
        productPrice: await this.getProductPrice(item.productId),
        productQuantity: item.quantity,
        productImageSRC: await this.getProductImage(item.productId),
      }))
    );
    return cartItems;
  }

  @Post('add-to-cart')
  async addToCart(@Body() body: { packageId: number }, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    if (!user.customerData) {
      user.customerData = new CustomerData();
      user.customerData.userId = user.id;
      user.customerData.cart = [];
      await this.userRepo.save(user);
    }

    let existingCartItem = user.customerData.cart.find(item => item.productId === body.packageId);
    if (existingCartItem) {
      existingCartItem.quantity++;
    } else {
      const newCartItem = this.cartItemRepo.create({
        productId: body.packageId,
        quantity: 1,
        customerDataId: user.customerData.customerDataId,
      });
      user.customerData.cart.push(newCartItem);
    }
    await this.userRepo.save(user);
    return { title: 'Added to the cart', message: 'Item added/updated successfully!' };
  }

  @Post('remove-from-cart')
  async removeFromCart(@Body() body: { cartItemId: number }, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    if (!cartItem) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

    await this.cartItemRepo.remove(cartItem);
    return { title: 'Item is removed from the cart', message: 'The package has been successfully removed from the cart' };
  }

  @Get('incre')
  async increaseQuantity(@Body() body: { cartItemId: number }, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    if (!cartItem) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

    cartItem.quantity++;
    await this.cartItemRepo.save(cartItem);
    return { title: 'Quantity Increased', message: 'Quantity increased successfully' };
  }

  @Get('decre')
  async decreaseQuantity(@Body() body: { cartItemId: number }, @Req() req: Request) {
    const user = await this.getCurrentUserAsync(req);
    if (!user) throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    if (!cartItem) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);

    if (cartItem.quantity > 1) {
      cartItem.quantity--;
      await this.cartItemRepo.save(cartItem);
      return { title: 'Quantity decreased', message: 'Quantity decreased successfully' };
    }

    throw new HttpException('Quantity cannot be less than 1', HttpStatus.BAD_REQUEST);
  }

  @Get('cart-price')
  async cartPriceAsync(@Req() req: Request): Promise<number> {
    const user = await this.getCurrentUserAsync(req);
    if (!user || !user.customerData) return 0;

    let cartPrice = 0;
    for (const item of user.customerData.cart) {
      cartPrice += await this.getProductPrice(item.productId) * item.quantity;
    }
    return cartPrice;
  }

  private async getProductPrice(packageId: number): Promise<number> {
    const packageEntity = await this.packageRepo.findOne({ where: { packageId } });
    return packageEntity?.price || 0;
  }

  private async getProductName(packageId: number): Promise<string> {
    const packageEntity = await this.packageRepo.findOne({ where: { packageId } });
    return packageEntity?.packageName || '';
  }

  private async getProductImage(packageId: number): Promise<Buffer | null> {
    const packageEntity = await this.packageRepo.findOne({
      where: { packageId },
      relations: ['packageData', 'packageData.packageImages'],
    });
    return packageEntity?.packageData?.packageImages[0]?.filebytes || null;
  }
}