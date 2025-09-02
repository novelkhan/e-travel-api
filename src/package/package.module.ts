import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageController } from './package.controller';
import { PackageService } from './package.service';
import { Package } from '../entities/package.entity';
import { PackageData } from '../entities/package-data.entity';
import { PackageImage } from '../entities/package-image.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Package, PackageData, PackageImage]), AuthModule],
  controllers: [PackageController],
  providers: [PackageService],
})
export class PackageModule {}