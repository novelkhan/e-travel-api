import { Controller, Post, Get, Put, Delete, Body, Param, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { RolesGuard } from '../shared/guards/roles.guard';
import { Roles } from '../shared/decorators/roles.decorator'; // Use custom Roles decorator
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AddPackageDto } from '../shared/dtos/add-package.dto';
import { Package } from '../shared/entities/package.entity';
import { PackageData } from '../shared/entities/package-data.entity';
import { PackageImage } from '../shared/entities/package-image.entity';

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
  async addPackage(@Body() addPackageDto: AddPackageDto) {
    const packageEntity = this.packageRepo.create({
      packageName: addPackageDto.packagename,
      destination: addPackageDto.destination,
      price: addPackageDto.price,
    });
    await this.packageRepo.save(packageEntity);
    return { title: 'Package Added', message: `${addPackageDto.packagename} package has been added successfully` };
  }

  @Get('packages')
  async getPackages(): Promise<Package[]> {
    return this.packageRepo.find();
  }

  @Get('package/:id')
  async getPackage(@Param('id') id: number) {
    const packageEntity = await this.packageRepo.findOne({
      where: { packageId: id },
      relations: ['packageData', 'packageData.packageImages'],
    });
    if (!packageEntity) throw new HttpException('Not Found', HttpStatus.NOT_FOUND);
    return packageEntity;
  }

  @Put('package/:id')
  @Roles('Admin')
  async putPackage(@Param('id') id: number, @Body() packageBody: Package) {
    if (id !== packageBody.packageId) throw new HttpException('Package ID does not match.', HttpStatus.BAD_REQUEST);

    const existingPackage = await this.packageRepo.findOne({
      where: { packageId: id },
      relations: ['packageData', 'packageData.packageImages'],
    });
    if (!existingPackage) throw new HttpException('Package not found.', HttpStatus.NOT_FOUND);

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

      // Image handling (assuming filebytes are base64 or buffer in body)
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
              existingImage.filebytes = newImage.filebytes; // Assume buffer
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
    return { message: 'Package updated successfully.' };
  }
}