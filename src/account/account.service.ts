import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserDto } from './dto/user.dto';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: LoginDto): Promise<UserDto> {
    const user = await this.userRepository.findOne({ where: { userName: loginDto.userName } });
    if (!user) {
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.emailConfirmed) {
      throw new UnauthorizedException('Please confirm your email.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.passwordHash);
    if (!isPasswordValid) {
      if (user.userName !== 'novel4004@gmail.com') {
        user.accessFailedCount += 1;
        if (user.accessFailedCount >= 3) {
          user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // Lock for 1 day
          await this.userRepository.save(user);
          throw new UnauthorizedException(
            `Your account has been locked. You should wait until ${user.lockoutEnd} (UTC time) to be able to login`,
          );
        }
        await this.userRepository.save(user);
      }
      throw new UnauthorizedException('Invalid username or password');
    }

    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      throw new UnauthorizedException(
        `Your account has been locked. You should wait until ${user.lockoutEnd} (UTC time) to be able to login`,
      );
    }

    user.accessFailedCount = 0;
    user.lockoutEnd = null;
    await this.userRepository.save(user);

    return this.createApplicationUserDto(user);
  }

  async register(registerDto: RegisterDto): Promise<any> {
    const existingUser = await this.userRepository.findOne({ where: { email: registerDto.email.toLowerCase() } });
    if (existingUser) {
      throw new BadRequestException(
        `An existing account is using ${registerDto.email}, email address. Please try with another email address`,
      );
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const user = this.userRepository.create({
      firstName: registerDto.firstName.toLowerCase(),
      lastName: registerDto.lastName.toLowerCase(),
      userName: registerDto.email.toLowerCase(),
      email: registerDto.email.toLowerCase(),
      passwordHash: hashedPassword,
    });

    await this.userRepository.save(user);

    // Add user to Customer role (Assuming role management is handled elsewhere)
    // For simplicity, we'll assume a default role is assigned in a separate role service
    await this.assignCustomerRole(user);

    if (await this.sendConfirmEmailAsync(user)) {
      return { title: 'Account Created', message: 'Your account has been created, please confirm your email address' };
    }

    throw new BadRequestException('Failed to send email. Please contact admin');
  }

  async confirmEmail(confirmEmailDto: ConfirmEmailDto): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email: confirmEmailDto.email } });
    if (!user) {
      throw new UnauthorizedException('This email address has not been registered yet');
    }

    if (user.emailConfirmed) {
      throw new BadRequestException('Your email was confirmed before. Please login to your account');
    }

    try {
      const decodedToken = Buffer.from(confirmEmailDto.token, 'base64').toString('utf8');
      // Simulate token validation (replace with actual token validation logic)
      user.emailConfirmed = true;
      await this.userRepository.save(user);
      return { title: 'Email confirmed', message: 'Your email address is confirmed. You can login now' };
    } catch {
      throw new BadRequestException('Invalid token. Please try again');
    }
  }

  async resendEmailConfirmationLink(email: string): Promise<any> {
    if (!email) {
      throw new BadRequestException('Invalid email');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('This email address has not been registered yet');
    }

    if (user.emailConfirmed) {
      throw new BadRequestException('Your email address was confirmed before. Please login to your account');
    }

    if (await this.sendConfirmEmailAsync(user)) {
      return { title: 'Confirmation link sent', message: 'Please confirm your email address' };
    }

    throw new BadRequestException('Failed to send email. Please contact admin');
  }

  async forgotUsernameOrPassword(email: string): Promise<any> {
    if (!email) {
      throw new BadRequestException('Invalid email');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('This email address has not been registered yet');
    }

    if (!user.emailConfirmed) {
      throw new BadRequestException('Please confirm your email address first.');
    }

    if (await this.sendForgotUsernameOrPasswordEmail(user)) {
      return { title: 'Forgot username or password email sent', message: 'Please check your email' };
    }

    throw new BadRequestException('Failed to send email. Please contact admin');
  }

  async resetPassword(resetPasswordDto: ResetPasswordDto): Promise<any> {
    const user = await this.userRepository.findOne({ where: { email: resetPasswordDto.email } });
    if (!user) {
      throw new UnauthorizedException('This email address has not been registered yet');
    }

    if (!user.emailConfirmed) {
      throw new BadRequestException('Please confirm your email address first');
    }

    try {
      const decodedToken = Buffer.from(resetPasswordDto.token, 'base64').toString('utf8');
      // Simulate password reset (replace with actual token validation logic)
      user.passwordHash = await bcrypt.hash(resetPasswordDto.newPassword, 10);
      await this.userRepository.save(user);
      return { title: 'Password reset success', message: 'Your password has been reset' };
    } catch {
      throw new BadRequestException('Invalid token. Please try again');
    }
  }

  async refreshPage(email: string): Promise<UserDto> {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid user');
    }

    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      throw new UnauthorizedException('You have been locked out');
    }

    return this.createApplicationUserDto(user);
  }

  private async createApplicationUserDto(user: User): Promise<UserDto> {
    await this.saveRefreshTokenAsync(user);
    return {
      firstName: user.firstName,
      lastName: user.lastName,
      jwt: await this.createJwt(user),
    };
  }

  private async createJwt(user: User): Promise<string> {
    const payload = {
      sub: user.id,
      email: user.userName,
      given_name: user.firstName,
      family_name: user.lastName,
    };
    return this.jwtService.sign(payload);
  }

  private async saveRefreshTokenAsync(user: User): Promise<void> {
    const token = Buffer.from(Math.random().toString()).toString('base64');
    const refreshToken = this.refreshTokenRepository.create({
      userId: user.id,
      token,
      dateExpiresUtc: new Date(Date.now() + 24 * 60 * 60 * 1000), // 1 day
    });

    const existingToken = await this.refreshTokenRepository.findOne({ where: { userId: user.id } });
    if (existingToken) {
      existingToken.token = refreshToken.token;
      existingToken.dateCreatedUtc = new Date();
      existingToken.dateExpiresUtc = refreshToken.dateExpiresUtc;
      await this.refreshTokenRepository.save(existingToken);
    } else {
      await this.refreshTokenRepository.save(refreshToken);
    }
  }

  private async isValidRefreshTokenAsync(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;
    const refreshToken = await this.refreshTokenRepository.findOne({ where: { userId, token } });
    if (!refreshToken || refreshToken.isExpired) return false;
    return true;
  }

  private async sendConfirmEmailAsync(user: User): Promise<boolean> {
    const token = Buffer.from(Math.random().toString()).toString('base64');
    const url = `${this.configService.get('JWT_CLIENT_URL')}/account/confirm-email?token=${token}&email=${user.email}`;
    const body = `
      <p>Hello, ${user.firstName} ${user.lastName}</p>
      <p>Please confirm your email address by clicking on the following link.</p>
      <p><a href="${url}">Click here</a></p>
      <p>Thank you,</p>
      <br>${this.configService.get('EMAIL_APPLICATION_NAME')}`;

    return this.emailService.sendEmailAsync({ to: user.email, subject: 'Confirm your email', body });
  }

  private async sendForgotUsernameOrPasswordEmail(user: User): Promise<boolean> {
    const token = Buffer.from(Math.random().toString()).toString('base64');
    const url = `${this.configService.get('JWT_CLIENT_URL')}/account/reset-password?token=${token}&email=${user.email}`;
    const body = `
      <p>Hello: ${user.firstName} ${user.lastName}</p>
      <p>Username: ${user.userName}.</p>
      <p>In order to reset your password, please click on the following link.</p>
      <p><a href="${url}">Click here</a></p>
      <p>Thank you,</p>
      <br>${this.configService.get('EMAIL_APPLICATION_NAME')}`;

    return this.emailService.sendEmailAsync({ to: user.email, subject: 'Forgot username or password', body });
  }

  private async assignCustomerRole(user: User): Promise<void> {
    // Placeholder for role assignment logic
    // In a real application, you would integrate with a role management system
    // For simplicity, we assume the role is assigned elsewhere
  }
}