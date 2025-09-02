import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';

@Injectable()
export class SeedService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async seed() {
    const adminExists = await this.userRepository.countBy({ email: 'novel4004@gmail.com' });
    if (adminExists === 0) {
      const hashedPassword = await bcrypt.hash('Admin123!', 10);
      const admin = this.userRepository.create({
        id: uuid(),
        username: 'novel4004@gmail.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        email: 'novel4004@gmail.com',
        roles: ['Admin'],
        emailConfirmed: true,
        dateCreated: new Date(),
      });
      await this.userRepository.save(admin);
    }
  }
}