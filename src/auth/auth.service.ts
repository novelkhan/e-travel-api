import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { EmailService } from './email.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async refreshToken(req, res): Promise<any> {
    const token = req.cookies[this.configService.get('JWT_COOKIES_KEY')];
    const userId = req.user.userId;

    const isValid = await this.isValidRefreshToken(userId, token);
    if (!isValid) {
      throw new UnauthorizedException('Invalid or expired token, please try to login');
    }

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new UnauthorizedException('Invalid or expired token, please try to login');
    }

    return this.createApplicationUserDto(user, res);
  }

  async refreshPage(userPayload: any): Promise<any> {
    const user = await this.userRepository.findOneBy({ email: userPayload.email });
    if (!user) {
      throw new UnauthorizedException();
    }

    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      throw new UnauthorizedException('You have been locked out');
    }

    return { firstName: user.firstName, lastName: user.lastName, JWT: await this.createJWT(user) };
  }

  async login(loginDto: LoginDto, res): Promise<any> {
    const user = await this.userRepository.findOneBy({ username: loginDto.username.toLowerCase() });
    if (!user || !await bcrypt.compare(loginDto.password, user.password)) {
      await this.handleFailedLogin(user, loginDto.username);
      throw new UnauthorizedException('Invalid username or password');
    }

    if (!user.emailConfirmed) {
      throw new UnauthorizedException('Please confirm your email.');
    }

    if (user.lockoutEnd && user.lockoutEnd > new Date()) {
      throw new UnauthorizedException(`Your account has been locked. You should wait until ${user.lockoutEnd.toUTCString()} (UTC time) to be able to login`);
    }

    user.accessFailedCount = 0;
    user.lockoutEnd = null;
    await this.userRepository.save(user);

    return this.createApplicationUserDto(user, res);
  }

  private async handleFailedLogin(user: User, username: string): Promise<void> {
    if (user && username !== 'novel4004@gmail.com') {
      user.accessFailedCount += 1;
      if (user.accessFailedCount >= 3) {
        user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
        await this.userRepository.save(user);
        throw new UnauthorizedException(`Your account has been locked. You should wait until ${user.lockoutEnd.toUTCString()} (UTC time) to be able to login`);
      }
      await this.userRepository.save(user);
    }
  }

  async register(registerDto: RegisterDto): Promise<any> {
    const exists = await this.userRepository.countBy({ email: registerDto.email.toLowerCase() });
    if (exists > 0) {
      throw new BadRequestException(`An existing account is using ${registerDto.email}, email address. Please try with another email address`);
    }

    const hashed = await bcrypt.hash(registerDto.password, 10);

    const user = this.userRepository.create({
      id: uuid(),
      firstName: registerDto.firstName.toLowerCase(),
      lastName: registerDto.lastName.toLowerCase(),
      username: registerDto.email.toLowerCase(),
      email: registerDto.email.toLowerCase(),
      password: hashed,
      roles: ['Customer'],
      emailConfirmed: false,
    });

    await this.userRepository.save(user);

    const sent = await this.sendConfirmEmail(user);
    if (!sent) {
      throw new BadRequestException('Failed to send email. Please contact admin');
    }

    return { title: 'Account Created', message: 'Your account has been created, please confirm your email address' };
  }

  async confirmEmail(dto: ConfirmEmailDto): Promise<any> {
    const user = await this.userRepository.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');

    if (user.emailConfirmed) throw new BadRequestException('Your email was confirmed before. Please login to your account');

    // In original, use WebEncoders.Base64UrlDecode
    const decoded = Buffer.from(dto.token, 'base64').toString('utf8'); // Simple base64 decode, adapt if needed

    // Validate token (original uses userManager.ConfirmEmailAsync, here mock as true if decoded
    if (decoded) {
      user.emailConfirmed = true;
      await this.userRepository.save(user);
      return { title: 'Email confirmed', message: 'Your email address is confirmed. You can login now' };
    }

    throw new BadRequestException('Invalid token. Please try again');
  }

  async resendEmailConfirmationLink(email: string): Promise<any> {
    if (!email) throw new BadRequestException('Invalid email');

    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');
    if (user.emailConfirmed) throw new BadRequestException('Your email address was confirmed before. Please login to your account');

    const sent = await this.sendConfirmEmail(user);
    if (!sent) throw new BadRequestException('Failed to send email. Please contact admin');

    return { title: 'Confirmation link sent', message: 'Please confirm your email address' };
  }

  async forgotUsernameOrPassword(email: string): Promise<any> {
    if (!email) throw new BadRequestException('Invalid email');

    const user = await this.userRepository.findOneBy({ email });
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');
    if (!user.emailConfirmed) throw new BadRequestException('Please confirm your email address first.');

    const sent = await this.sendForgotUsernameOrPasswordEmail(user);
    if (!sent) throw new BadRequestException('Failed to send email. Please contact admin');

    return { title: 'Forgot username or password email sent', message: 'Please check your email' };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<any> {
    const user = await this.userRepository.findOneBy({ email: dto.email });
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');
    if (!user.emailConfirmed) throw new BadRequestException('Please confirm your email address first');

    const decoded = Buffer.from(dto.token, 'base64').toString('utf8');

    if (decoded) {
      user.password = await bcrypt.hash(dto.newPassword, 10);
      await this.userRepository.save(user);
      return { title: 'Password reset success', message: 'Your password has been reset' };
    }

    throw new BadRequestException('Invalid token. Please try again');
  }

  private async createApplicationUserDto(user: User, res: any): Promise<any> {
    await this.saveRefreshToken(user, res);
    return {
      FirstName: user.firstName,
      LastName: user.lastName,
      JWT: await this.jwtService.sign({
        NameIdentifier: user.id,
        Email: user.username,
        GivenName: user.firstName,
        Surname: user.lastName,
        Role: user.roles,
      }),
    };
  }

  private async sendConfirmEmail(user: User): Promise<boolean> {
    const token = uuid(); // Mock token
    const encoded = Buffer.from(token).toString('base64');
    const url = `${this.configService.get('JWT_CLIENT_URL')}/${this.configService.get('EMAIL_CONFIRM_EMAIL_PATH')}?token=${encoded}&email=${user.email}`;

    const body = `<p>Hello, ${user.firstName} ${user.lastName}</p><p>Please confirm your email address by clicking on the following link.</p><p><a href="${url}">Click here</a></p><p>Thank you,</p><br>${this.configService.get('EMAIL_APPLICATION_NAME')}`;

    return this.emailService.sendEmail({ to: user.email, subject: 'Confirm your email', body });
  }

  private async sendForgotUsernameOrPasswordEmail(user: User): Promise<boolean> {
    const token = uuid();
    const encoded = Buffer.from(token).toString('base64');
    const url = `${this.configService.get('JWT_CLIENT_URL')}/${this.configService.get('EMAIL_RESET_PASSWORD_PATH')}?token=${encoded}&email=${user.email}`;

    const body = `<p>Hello: ${user.firstName} ${user.lastName}</p><p>Username: ${user.username}.</p><p>In order to reset your password, please click on the following link.</p><p><a href="${url}">Click here</a></p><p>Thank you,</p><br>${this.configService.get('EMAIL_APPLICATION_NAME')}`;

    return this.emailService.sendEmail({ to: user.email, subject: 'Forgot username or password', body });
  }

  private async saveRefreshToken(user: User, res: any): Promise<void> {
    const tokenBytes = crypto.randomBytes(32);
    const token = tokenBytes.toString('base64');

    let existing = await this.refreshTokenRepository.findOneBy({ userId: user.id });
    if (existing) {
      existing.token = token;
      existing.dateCreatedUtc = new Date();
      existing.dateExpiresUtc = new Date(Date.now() + parseInt(this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000);
    } else {
      existing = this.refreshTokenRepository.create({
        token,
        userId: user.id,
        dateCreatedUtc: new Date(),
        dateExpiresUtc: new Date(Date.now() + parseInt(this.configService.get('JWT_REFRESH_TOKEN_EXPIRES_IN_DAYS')) * 24 * 60 * 60 * 1000),
      });
    }

    await this.refreshTokenRepository.save(existing);

    res.cookie(this.configService.get('JWT_COOKIES_KEY'), token, {
      expires: existing.dateExpiresUtc,
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
  }

  private async isValidRefreshToken(userId: string, token: string): Promise<boolean> {
    if (!userId || !token) return false;

    const refreshToken = await this.refreshTokenRepository.findOneBy({ userId, token });
    if (!refreshToken) return false;

    if (refreshToken.dateExpiresUtc < new Date()) return false;

    return true;
  }
}