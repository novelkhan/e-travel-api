import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: 'postgresql://e_travel_user:wOTk40ldQYvHL1Ym1LhGdTCEafh3NeYD@dpg-d2ndo675r7bs73feu7n0-a.oregon-postgres.render.com/e_travel',
      entities: [User, RefreshToken],
      synchronize: true, // Development only, set to false in production
      ssl: { rejectUnauthorized: false }, // Required for Render.com
    }),
    JwtModule.register({
      secret: 'cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e', // From appsettings.json
      signOptions: { expiresIn: '30m' },
    }),
    AccountModule,
  ],
})
export class AppModule {}