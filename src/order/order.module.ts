import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './order.controller';
import { OrderService } from './order.service';
import { Order } from '../entities/order.entity';
import { OrderItem } from '../entities/order-item.entity';
import { Package } from '../entities/package.entity';
import { CustomerData } from '../entities/customer-data.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem, Package, CustomerData]), AuthModule],
  controllers: [OrderController],
  providers: [OrderService],
})
export class OrderModule {}