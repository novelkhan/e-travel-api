import { Injectable, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Request } from 'express';
import { REQUEST } from '@nestjs/core';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @Inject(REQUEST) private readonly request: Request,
  ) {}

  getCustomers() {
    return { message: 'Only authorized users can view this action method' };
  }

  getCurrentUser(): User | null {
    // Get the user ID of the currently logged-in user synchronously
    const userId = this.getCurrentUserId();
    if (!userId) {
      return null;
    }

    // Retrieve the User object from the database synchronously
    const user = this.userRepository.findOne({ where: { id: userId } });
    return user || null;
  }

  async getCurrentUserAsync(): Promise<User | null> {
    // Asynchronously get the user ID of the currently logged-in user
    const userId = await this.getCurrentUserIdAsync();
    if (!userId) {
      return null;
    }

    // Retrieve the User object from the database
    const user = await this.userRepository.findOne({ where: { id: userId } });
    return user || null;
  }

  getCurrentUserId(): string | null {
    // Get the user ID of the currently logged-in user from JWT payload
    return this.request.user ? (this.request.user as any).sub : null;
  }

  async getCurrentUserIdAsync(): Promise<string | null> {
    // Asynchronously get the user ID of the currently logged-in user
    return Promise.resolve(this.request.user ? (this.request.user as any).sub : null);
  }
}