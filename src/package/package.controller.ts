import { Controller, Get, Param } from '@nestjs/common';
import { PackageService } from './package.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('package')
@Controller('api/package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @Get()
  async getPackages() {
    return this.packageService.getPackages();
  }

  @Get(':id')
  async getPackageById(@Param('id') id: number) {
    return this.packageService.getPackageById(id);
  }
}