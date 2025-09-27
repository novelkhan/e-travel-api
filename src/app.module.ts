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
import { Logger } from '@nestjs/common'; // অ্যাড
import { PassportModule } from '@nestjs/passport'; // নতুন যোগ করা
import { JwtStrategy } from './shared/strategies/jwt.strategy'; // নতুন যোগ করা

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL') || 'postgresql://e_travel_6cz3_user:lXUjYQ8Qk3OTLvUqJ7khwcihAK0tUx1q@dpg-d3bu9cogjchc738p3700-a.oregon-postgres.render.com/e_travel_6cz3',
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
    PassportModule.register({ defaultStrategy: 'jwt' }), // নতুন যোগ করা
    AccountModule,
    AdminModule,
    CustomerModule,
    CartModule,
    OrderModule,
    PackageModule,
  ],
  providers: [ContextSeedService, JwtStrategy], // নতুন যোগ করা: JwtStrategy
})
export class AppModule implements OnModuleInit {
  private readonly logger = new Logger(AppModule.name); // লগ অ্যাড

  constructor(private readonly contextSeedService: ContextSeedService) {}

  async onModuleInit() {
    this.logger.log('onModuleInit: Starting database seeding...');
    try {
      await this.contextSeedService.initializeContext(); // Seed data on init
      this.logger.log('onModuleInit: Database seeding completed successfully.');
    } catch (error) {
      this.logger.error(`onModuleInit: Error during seeding - ${error.message}`);
    }
  }
}