// src/cart/cart.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartController } from './cart.controller';
import { User } from '../shared/entities/user.entity';
import { CustomerData } from '../shared/entities/customer-data.entity';
import { CartItem } from '../shared/entities/cart-item.entity';
import { Package } from '../shared/entities/package.entity';
import { PackageData } from '../shared/entities/package-data.entity';
import { PackageImage } from '../shared/entities/package-image.entity';
import { Role } from '../shared/entities/role.entity'; // নতুন ইমপোর্ট
import { UserRole } from '../shared/entities/user-role.entity'; // নতুন ইমপোর্ট
import { UserService } from '../shared/services/user.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      CustomerData,
      CartItem,
      Package,
      PackageData,
      PackageImage,
      Role, // যোগ করা হলো
      UserRole, // যোগ করা হলো
    ]),
  ],
  controllers: [CartController],
  providers: [UserService],
})
export class CartModule {}