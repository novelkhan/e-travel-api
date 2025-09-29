// src/package/package.controller.ts
import { Controller, Post, Get, Put, Body, Param, UseGuards, HttpStatus, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddPackageDto } from '../shared/dtos/add-package.dto';
import { Package } from '../shared/entities/package.entity';
import { PackageData } from '../shared/entities/package-data.entity';
import { PackageImage } from '../shared/entities/package-image.entity';
import { ResponseUtil } from '../shared/utils/response.util';

@Controller('package')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PackageController {
  constructor(
    @InjectRepository(Package) private packageRepo: Repository<Package>,
    @InjectRepository(PackageData) private packageDataRepo: Repository<PackageData>,
    @InjectRepository(PackageImage) private packageImageRepo: Repository<PackageImage>,
  ) {}

  @Post('add-package')
  @Roles('Admin')
  async addPackage(@Body() addPackageDto: AddPackageDto, @Res() res: Response) {
    const packageEntity = this.packageRepo.create({
      packageName: addPackageDto.packagename,
      destination: addPackageDto.destination,
      price: addPackageDto.price,
    });
    
    await this.packageRepo.save(packageEntity);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.success('Package Added', `${addPackageDto.packagename} package has been added successfully`));
  }

  @Get('packages')
  async getPackages(@Res() res: Response) {
    const packages = await this.packageRepo.find();
    
    if (packages.length === 0) {
      throw new NotFoundException('No packages found');
    }
    
    return res.status(HttpStatus.OK).json(packages);
  }

  @Get('package/:id')
  async getPackage(@Param('id') id: number, @Res() res: Response) {
    const packageEntity = await this.packageRepo.findOne({
      where: { packageId: id },
      relations: ['packageData', 'packageData.packageImages'],
    });
    
    if (!packageEntity) {
      throw new NotFoundException('Package not found');
    }

    return res.status(HttpStatus.OK).json(packageEntity);
  }

  @Put('package/:id')
  @Roles('Admin')
  async putPackage(@Param('id') id: number, @Body() packageBody: Package, @Res() res: Response) {
    if (id !== packageBody.packageId) {
      throw new BadRequestException('Package ID does not match.');
    }

    const existingPackage = await this.packageRepo.findOne({
      where: { packageId: id },
      relations: ['packageData', 'packageData.packageImages'],
    });
    
    if (!existingPackage) {
      throw new NotFoundException('Package not found.');
    }

    existingPackage.packageName = packageBody.packageName;
    existingPackage.destination = packageBody.destination;
    existingPackage.price = packageBody.price;

    if (packageBody.packageData) {
      if (!existingPackage.packageData) {
        existingPackage.packageData = this.packageDataRepo.create({
          description: packageBody.packageData.description,
          viaDestination: packageBody.packageData.viaDestination,
          date: new Date(packageBody.packageData.date) || new Date(),
          availableSeat: packageBody.packageData.availableSeat,
          packageId: existingPackage.packageId,
          packageImages: [],
        });
      } else {
        existingPackage.packageData.description = packageBody.packageData.description;
        existingPackage.packageData.viaDestination = packageBody.packageData.viaDestination;
        existingPackage.packageData.date = new Date(packageBody.packageData.date) || existingPackage.packageData.date;
        existingPackage.packageData.availableSeat = packageBody.packageData.availableSeat;
      }

      // Image handling
      if (packageBody.packageData.packageImages && packageBody.packageData.packageImages.length > 0) {
        const imageIdsToKeep = packageBody.packageData.packageImages
          .filter(img => img.packageImageId > 0)
          .map(img => img.packageImageId);

        existingPackage.packageData.packageImages = existingPackage.packageData.packageImages.filter(img => imageIdsToKeep.includes(img.packageImageId));

        for (const newImage of packageBody.packageData.packageImages) {
          if (newImage.packageImageId > 0) {
            const existingImage = existingPackage.packageData.packageImages.find(img => img.packageImageId === newImage.packageImageId);
            if (existingImage) {
              existingImage.filename = newImage.filename;
              existingImage.filetype = newImage.filetype;
              existingImage.filesize = newImage.filesize;
              existingImage.filebytes = newImage.filebytes;
            }
          } else {
            const image = this.packageImageRepo.create({
              filename: newImage.filename,
              filetype: newImage.filetype,
              filesize: newImage.filesize,
              filebytes: newImage.filebytes,
              packageDataId: existingPackage.packageData.packageDataId,
            });
            existingPackage.packageData.packageImages.push(image);
          }
        }
      } else {
        existingPackage.packageData.packageImages = [];
      }
    }

    await this.packageRepo.save(existingPackage);
    
    return res.status(HttpStatus.OK).json(ResponseUtil.successMessage('Package updated successfully.'));
  }
}