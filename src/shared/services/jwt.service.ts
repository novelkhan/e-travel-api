// src/shared/services/jwt.service.ts
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';
import { Logger } from '@nestjs/common'; // অ্যাড

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name); // লগ অ্যাড

  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createJwt(user: User): Promise<string> {
    this.logger.log(`createJwt: Creating JWT for user ID: ${user.id}`);
    const roles = await this.getUserRoles(user.id);
    const payload = {
      sub: user.id,
      email: user.userName,
      given_name: user.firstName,
      surname: user.lastName,
      roles: roles,
    };
    const jwt = this.nestJwtService.sign(payload, {
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN_MINUTES') || 30,
      issuer: this.configService.get<string>('JWT_ISSUER') || 'https://localhost:7039',
    });
    this.logger.log(`createJwt: JWT created successfully.`);
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
    const roles = user.userRoles.map(ur => ur.role.name);
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

  async saveRefreshToken(user: User): Promise<void> {
    this.logger.log(`saveRefreshToken: Saving refresh token for user ID: ${user.id}`);
    const refreshToken = await this.createRefreshToken(user);
    const existing = await this.refreshTokenRepository.findOne({ where: { userId: user.id } });
    if (existing) {
      existing.token = refreshToken.token;
      existing.dateCreatedUtc = refreshToken.dateCreatedUtc;
      existing.dateExpiresUtc = refreshToken.dateExpiresUtc;
      await this.refreshTokenRepository.save(existing);
      this.logger.log('saveRefreshToken: Existing token updated.');
    } else {
      // নতুন টোকেন অ্যাড করো এবং user save করো
      user.refreshTokens = user.refreshTokens || [];
      user.refreshTokens.push(refreshToken);
      await this.userRepository.save(user);
      this.logger.log('saveRefreshToken: New token saved.');
    }
  }
}