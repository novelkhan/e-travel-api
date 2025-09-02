import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Package } from '../entities/package.entity';
import { PackageData } from '../entities/package-data.entity';
import { PackageImage } from '../entities/package-image.entity';
import { Order } from '../entities/order.entity';
import { MemberAddEditDto } from './dto/member-add-edit.dto';
import { AddPackageDto } from '../package/dto/add-package.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Package)
    private packageRepository: Repository<Package>,
    @InjectRepository(PackageData)
    private packageDataRepository: Repository<PackageData>,
    @InjectRepository(PackageImage)
    private packageImageRepository: Repository<PackageImage>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async getMembers(): Promise<any> {
    const users = await this.userRepository.find({ select: ['id', 'username', 'firstName', 'lastName', 'email', 'roles', 'emailConfirmed', 'dateCreated'] });
    return users.map(user => ({
      id: user.id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      roles: user.roles,
      emailConfirmed: user.emailConfirmed,
      dateCreated: user.dateCreated,
    }));
  }

  async addMember(dto: MemberAddEditDto): Promise<any> {
    const exists = await this.userRepository.countBy({ email: dto.email.toLowerCase() });
    if (exists > 0) {
      throw new BadRequestException(`An existing account is using ${dto.email}, email address. Please try with another email address`);
    }

    const hashed = await bcrypt.hash(dto.password, 10);

    const user = this.userRepository.create({
      id: uuid(),
      firstName: dto.firstName.toLowerCase(),
      lastName: dto.lastName.toLowerCase(),
      username: dto.email.toLowerCase(),
      email: dto.email.toLowerCase(),
      password: hashed,
      roles: ['Customer'],
      emailConfirmed: true, // Admin-added users are auto-confirmed
    });

    await this.userRepository.save(user);
    return { title: 'Member Added', message: 'Member has been added successfully' };
  }

  async editMember(id: string, dto: MemberAddEditDto): Promise<any> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.firstName = dto.firstName.toLowerCase();
    user.lastName = dto.lastName.toLowerCase();
    user.email = dto.email.toLowerCase();
    user.username = dto.email.toLowerCase();
    if (dto.password) {
      user.password = await bcrypt.hash(dto.password, 10);
    }

    await this.userRepository.save(user);
    return { title: 'Member Updated', message: 'Member has been updated successfully' };
  }

  async deleteMember(id: string): Promise<any> {
    const user = await this.userRepository.findOneBy({ id });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.userRepository.delete(id);
    return { title: 'Member Deleted', message: 'Member has been deleted successfully' };
  }

  async addPackage(dto: AddPackageDto, user: any): Promise<any> {
    const pkg = this.packageRepository.create({
      packageName: dto.packageName,
      destination: dto.destination,
      price: dto.price,
      dateCreated: new Date(),
    });

    const savedPackage = await this.packageRepository.save(pkg);

    const packageData = this.packageDataRepository.create({
      packageId: savedPackage.packageId,
      description: dto.description,
      viaDestination: dto.viaDestination,
      date: new Date(dto.date),
      availableSeat: dto.availableSeat,
    });

    const savedPackageData = await this.packageDataRepository.save(packageData);

    for (const image of dto.images) {
      const packageImage = this.packageImageRepository.create({
        packageDataId: savedPackageData.packageDataId,
        filename: image.filename,
        filetype: image.filetype,
        filesize: image.filesize,
        filebytes: Buffer.from(image.filebytes, 'base64'),
      });
      await this.packageImageRepository.save(packageImage);
    }

    return { title: 'Package Added', message: 'Package has been added successfully' };
  }

  async editPackage(id: number, dto: AddPackageDto, user: any): Promise<any> {
    const pkg = await this.packageRepository.findOneBy({ packageId: id });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    pkg.packageName = dto.packageName;
    pkg.destination = dto.destination;
    pkg.price = dto.price;

    await this.packageRepository.save(pkg);

    const packageData = await this.packageDataRepository.findOneBy({ packageId: id });
    if (packageData) {
      packageData.description = dto.description;
      packageData.viaDestination = dto.viaDestination;
      packageData.date = new Date(dto.date);
      packageData.availableSeat = dto.availableSeat;
      await this.packageDataRepository.save(packageData);

      await this.packageImageRepository.delete({ packageDataId: packageData.packageDataId });

      for (const image of dto.images) {
        const packageImage = this.packageImageRepository.create({
          packageDataId: packageData.packageDataId,
          filename: image.filename,
          filetype: image.filetype,
          filesize: image.filesize,
          filebytes: Buffer.from(image.filebytes, 'base64'),
        });
        await this.packageImageRepository.save(packageImage);
      }
    }

    return { title: 'Package Updated', message: 'Package has been updated successfully' };
  }

  async deletePackage(id: number): Promise<any> {
    const pkg = await this.packageRepository.findOneBy({ packageId: id });
    if (!pkg) {
      throw new NotFoundException('Package not found');
    }

    await this.packageRepository.delete(id);
    return { title: 'Package Deleted', message: 'Package has been deleted successfully' };
  }

  async getOrders(): Promise<any> {
    const orders = await this.orderRepository.find({ relations: ['orderItems'] });
    return orders.map(order => ({
      orderId: order.orderId,
      customerId: order.customerId,
      orderDate: order.orderDate,
      totalAmount: order.totalAmount,
      isPaid: order.isPaid,
      isShipped: order.isShipped,
      shippingDate: order.shippingDate,
      orderItems: order.orderItems.map(item => ({
        orderItemId: item.orderItemId,
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        perUnitPrice: item.perUnitPrice,
        totalPrice: item.totalPrice,
      })),
    }));
  }
}