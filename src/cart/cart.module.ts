import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { CartService } from './cart.service';
import { CartItem } from '../entities/cart-item.entity';
import { CustomerData } from '../entities/customer-data.entity';
import { Package } from '../entities/package.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CartItem, CustomerData, Package]), AuthModule],
  controllers: [CartController],
  providers: [CartService],
})
export class CartModule {}