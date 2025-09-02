// src/app.module.ts
import { Module, OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AccountModule } from './account/account.module';
import { AdminModule } from './admin/admin.module';
import { CustomerModule } from './customer/customer.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { PackageModule } from './package/package.module';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ContextSeedService } from './shared/services/context-seed.service';
import { User } from './shared/entities/user.entity';
import { RefreshToken } from './shared/entities/refresh-token.entity';
import { Package } from './shared/entities/package.entity';
import { PackageData } from './shared/entities/package-data.entity';
import { PackageImage } from './shared/entities/package-image.entity';
import { Order } from './shared/entities/order.entity';
import { OrderItem } from './shared/entities/order-item.entity';
import { CustomerData } from './shared/entities/customer-data.entity';
import { CustomerFile } from './shared/entities/customer-file.entity';
import { CartItem } from './shared/entities/cart-item.entity';
import { Role } from './shared/entities/role.entity';
import { UserRole } from './shared/entities/user-role.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
      type: 'postgres',
      url: configService.get<string>('DATABASE_URL') || 'postgresql://e_travel_user:wOTk40ldQYvHL1Ym1LhGdTCEafh3NeYD@dpg-d2ndo675r7bs73feu7n0-a.oregon-postgres.render.com/e_travel',
      entities: [User, RefreshToken, Package, PackageData, PackageImage, Order, OrderItem, CustomerData, CustomerFile, CartItem, Role, UserRole],
      synchronize: false,  // এটা false করো
      ssl: {
        rejectUnauthorized: false,
      },
    }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([User, Role, UserRole]),
    JwtModule.registerAsync({
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_KEY') || 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e',
        signOptions: { expiresIn: '30m' },
      }),
      inject: [ConfigService],
      global: true,
    }),
    AccountModule,
    AdminModule,
    CustomerModule,
    CartModule,
    OrderModule,
    PackageModule,
  ],
  providers: [ContextSeedService],
})
export class AppModule implements OnModuleInit {
  constructor(private readonly contextSeedService: ContextSeedService) {}

  async onModuleInit() {
    await this.contextSeedService.initializeContext(); // Seed data on init
  }
}