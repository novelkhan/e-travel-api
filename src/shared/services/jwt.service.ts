// ------------------------------------------------
// src/shared/services/jwt.service.ts (JWTService)
// ------------------------------------------------
import { Injectable } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RefreshToken } from '../entities/refresh-token.entity';
import * as crypto from 'crypto';
import { User } from '../entities/user.entity';

@Injectable()
export class JwtService {
  constructor(
    private readonly nestJwtService: NestJwtService,
    private readonly configService: ConfigService,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async createJwt(user: User): Promise<string> {
    const roles = await this.getUserRoles(user.id);
    const payload = {
      sub: user.id,
      email: user.userName,
      given_name: user.firstName,
      surname: user.lastName,
      roles: roles,
    };
    return this.nestJwtService.sign(payload, {
      expiresIn: this.configService.get<number>('JWT_EXPIRES_IN_MINUTES') || 30,
      issuer: this.configService.get<string>('JWT_ISSUER') || 'https://localhost:7039',
    });
  }

  async createRefreshToken(user: User): Promise<RefreshToken> {
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64');

    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token,
      dateCreatedUtc: new Date(),
      dateExpiresUtc: new Date(Date.now() + (this.configService.get<number>('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS') || 1) * 24 * 60 * 60 * 1000),
    });

    await this.refreshTokenRepository.save(refreshToken);
    return refreshToken;
  }

  async getUserRoles(userId: string): Promise<string[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['userRoles', 'userRoles.role'],
    });
    return user.userRoles.map(ur => ur.role.name);
  }

  async isValidRefreshToken(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;
    const refreshToken = await this.refreshTokenRepository.findOne({ where: { userId, token } });
    if (!refreshToken) return false;
    return new Date() < refreshToken.dateExpiresUtc;
  }

  async saveRefreshToken(user: User): Promise<void> {
    const refreshToken = await this.createRefreshToken(user);
    // In ASP.NET, it updates if exists, here same
    const existing = await this.refreshTokenRepository.findOne({ where: { userId: user.id } });
    if (existing) {
      existing.token = refreshToken.token;
      existing.dateCreatedUtc = refreshToken.dateCreatedUtc;
      existing.dateExpiresUtc = refreshToken.dateExpiresUtc;
      await this.refreshTokenRepository.save(existing);
    } else {
      user.refreshTokens.push(refreshToken);
      await this.userRepository.save(user);
    }
  }
}