// src/cart/cart.controller.ts
import { Controller, Get, Post, Body, UseGuards, Req, HttpStatus, Res, BadRequestException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../shared/entities/cart-item.entity';
import { Package } from '../shared/entities/package.entity';
import { Request } from 'express';
import { User } from '../shared/entities/user.entity';
import { CustomerData } from '../shared/entities/customer-data.entity';
import { ResponseUtil } from '../shared/utils/response.util'; // নতুন যোগ করুন

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
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

  @Get('cart-items')
  async cartItems(@Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);
    if (!user.customerData) {
      throw new UnauthorizedException('Customer data not found');
    }

    const cartItems = await Promise.all(
      user.customerData.cart.map(async (item) => ({
        cartItemId: item.cartItemId,
        productName: await this.getProductName(item.productId),
        productPrice: await this.getProductPrice(item.productId),
        productQuantity: item.quantity,
        productImageSRC: await this.getProductImage(item.productId),
      }))
    );
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successData(cartItems));
  }

  @Post('add-to-cart')
  async addToCart(@Body() body: { packageId: number }, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

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
    
    return res.status(HttpStatus.OK).json(ResponseUtil.success('Added to the cart', 'Item added/updated successfully!'));
  }

  @Post('remove-from-cart')
  async removeFromCart(@Body() body: { cartItemId: number }, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    await this.cartItemRepo.remove(cartItem);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.success('Item is removed from the cart', 'The package has been successfully removed from the cart'));
  }

  @Get('incre')
  async increaseQuantity(@Body() body: { cartItemId: number }, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    cartItem.quantity++;
    await this.cartItemRepo.save(cartItem);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.success('Quantity Increased', 'Quantity increased successfully'));
  }

  @Get('decre')
  async decreaseQuantity(@Body() body: { cartItemId: number }, @Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);

    const cartItem = await this.cartItemRepo.findOne({
      where: { cartItemId: body.cartItemId, customerDataId: user.customerData.customerDataId },
    });
    
    if (!cartItem) {
      throw new NotFoundException('Cart item not found');
    }

    if (cartItem.quantity > 1) {
      cartItem.quantity--;
      await this.cartItemRepo.save(cartItem);
      
      return res.status(HttpStatus.OK).json(ResponseUtil.success('Quantity decreased', 'Quantity decreased successfully'));
    }

    throw new BadRequestException('Quantity cannot be less than 1');
  }

  @Get('cart-price')
  async cartPriceAsync(@Req() req: Request, @Res() res: Response) {
    const user = await this.getCurrentUserAsync(req);
    if (!user.customerData) {
      return res.status(HttpStatus.OK).json(ResponseUtil.successData(0));
    }

    let cartPrice = 0;
    for (const item of user.customerData.cart) {
      cartPrice += await this.getProductPrice(item.productId) * item.quantity;
    }
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successData(cartPrice));
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