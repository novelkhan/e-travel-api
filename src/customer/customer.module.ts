import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { CustomerData } from '../entities/customer-data.entity';
import { CustomerFile } from '../entities/customer-file.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerData, CustomerFile]), AuthModule],
  controllers: [CustomerController],
  providers: [CustomerService],
})
export class CustomerModule {}