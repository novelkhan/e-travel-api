// ------------------------------------------------
// src/package/package.module.ts
// ------------------------------------------------
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PackageController } from './package.controller';
import { Package } from '../shared/entities/package.entity';
import { PackageData } from '../shared/entities/package-data.entity';
import { PackageImage } from '../shared/entities/package-image.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Package, PackageData, PackageImage])],
  controllers: [PackageController],
})
export class PackageModule {}