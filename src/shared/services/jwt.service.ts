// src/shared/services/jwt.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { Logger } from '@nestjs/common';

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  // src/shared/services/jwt.service.ts
  async createJwt(user: User): Promise<string> {
    this.logger.log(`createJwt: Creating JWT for user ID: ${user.id}`);
    const roles = await this.getUserRoles(user.id);
    const payload = {
      sub: user.id,
      email: user.userName,
      given_name: user.firstName,
      surname: user.lastName,
      role: roles,
    };
    
    const expiresIn = this.configService.get<string>('JWT_EXPIRES_IN_MINUTES') + 'm' || '30m';
    
    const jwt = this.nestJwtService.sign(payload, {
      expiresIn: expiresIn, // সঠিক format এ দিন
      issuer: this.configService.get<string>('JWT_ISSUER') || 'https://localhost:7039',
    });
    
    this.logger.log(`createJwt: JWT created with roles: ${roles.join(', ')}`);
    return jwt;
  }

  async createRefreshToken(user: User): Promise<RefreshToken> {
    this.logger.log(`createRefreshToken: Creating refresh token for user ID: ${user.id}`);
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64');

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token,
      dateCreatedUtc: new Date(),
      dateExpiresUtc: new Date(Date.now() + (this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS') || 1) * 24 * 60 * 60 * 1000),
    });

    await this.refreshTokenRepository.save(refreshToken);
    this.logger.log(`createRefreshToken: Refresh token created with ID: ${refreshToken.id}`);
    return refreshToken;
  }

  async getUserRoles(userId: string): Promise<string[]> {
    this.logger.log(`getUserRoles: Fetching roles for user ID: ${userId}`);
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });
    if (!user) {
      this.logger.warn(`getUserRoles: User not found for ID: ${userId}`);
      return [];
    }
    const roles = user.userRoles.map((ur) => ur.role.name);
    this.logger.log(`getUserRoles: Roles: ${roles.join(', ')}`);
    return roles;
  }

  async isValidRefreshToken(userId: string, token: string): Promise<boolean> {
    this.logger.log(`isValidRefreshToken: Validating token for user ID: ${userId}`);
    if (!userId || !token) {
      this.logger.warn('isValidRefreshToken: Invalid userId or token.');
      return false;
    }
    const refreshToken = await this.refreshTokenRepository.findOne({ where: { userId, token } });
    if (!refreshToken) {
      this.logger.warn(`isValidRefreshToken: Token not found.`);
      return false;
    }
    const isValid = new Date() < refreshToken.dateExpiresUtc;
    this.logger.log(`isValidRefreshToken: Valid: ${isValid}`);
    return isValid;
  }

  // src/shared/services/jwt.service.ts - saveRefreshToken মেথড
  async saveRefreshToken(user: User): Promise<void> {
    this.logger.log(`saveRefreshToken: Saving refresh token for user ID: ${user.id}`);
    
    const refreshToken = await this.createRefreshToken(user);
    
    // প্রথমে existing token খুঁজুন
    const existing = await this.refreshTokenRepository.findOne({ 
      where: { userId: user.id } 
    });
    
    if (existing) {
      this.logger.log('saveRefreshToken: Updating existing token');
      existing.token = refreshToken.token;
      existing.dateCreatedUtc = refreshToken.dateCreatedUtc;
      existing.dateExpiresUtc = refreshToken.dateExpiresUtc;
      await this.refreshTokenRepository.save(existing);
    } else {
      this.logger.log('saveRefreshToken: Creating new token');
      // নতুন token create করুন এবং user এর সাথে associate করুন
      refreshToken.user = user;
      await this.refreshTokenRepository.save(refreshToken);
    }
    
    this.logger.log('saveRefreshToken: Token saved successfully');
  }
}