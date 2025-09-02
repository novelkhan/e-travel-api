import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Package } from '../entities/package.entity';
import { PackageData } from '../entities/package-data.entity';
import { PackageImage } from '../entities/package-image.entity';

@Injectable()
export class PackageService {
  constructor(
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(PackageData)
    private packageDataRepository: Repository<PackageData>,
    @InjectRepository(PackageImage)
    private packageImageRepository: Repository<PackageImage>,
  ) {}

  async getPackages(): Promise<any> {
    const packages = await this.packageRepository.find({ relations: ['packageData', 'packageData.packageImages'] });
    return packages.map(pkg => ({
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      destination: pkg.destination,
      price: pkg.price,
      dateCreated: pkg.dateCreated,
      packageData: pkg.packageData
        ? {
            packageDataId: pkg.packageData.packageDataId,
            description: pkg.packageData.description,
            viaDestination: pkg.packageData.viaDestination,
            date: pkg.packageData.date,
            availableSeat: pkg.packageData.availableSeat,
            packageImages: pkg.packageData.packageImages.map(img => ({
              packageImageId: img.packageImageId,
              filename: img.filename,
              filetype: img.filetype,
              filesize: img.filesize,
              filebytes: img.filebytes ? img.filebytes.toString('base64') : null,
            })),
          }
        : null,
    }));
  }

  async getPackageById(id: number): Promise<any> {
    const pkg = await this.packageRepository.findOne({
      where: { packageId: id },
      relations: ['packageData', 'packageData.packageImages'],
    });

    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    return {
      packageId: pkg.packageId,
      packageName: pkg.packageName,
      destination: pkg.destination,
      price: pkg.price,
      dateCreated: pkg.dateCreated,
      packageData: pkg.packageData
        ? {
            packageDataId: pkg.packageData.packageDataId,
            description: pkg.packageData.description,
            viaDestination: pkg.packageData.viaDestination,
            date: pkg.packageData.date,
            availableSeat: pkg.packageData.availableSeat,
            packageImages: pkg.packageData.packageImages.map(img => ({
              packageImageId: img.packageImageId,
              filename: img.filename,
              filetype: img.filetype,
              filesize: img.filesize,
              filebytes: img.filebytes ? img.filebytes.toString('base64') : null,
            })),
          }
        : null,
    };
  }
}