// src/account/account.controller.ts
import { Controller, Post, Get, Put, Body, Req, UseGuards, Param, HttpException, HttpStatus, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../shared/guards/jwt.guard';
import { LoginDto } from '../shared/dtos/login.dto';
import { RegisterDto } from '../shared/dtos/register.dto';
import { ConfirmEmailDto } from '../shared/dtos/confirm-email.dto';
import { ResetPasswordDto } from '../shared/dtos/reset-password.dto';
import { UserDto } from '../shared/dtos/user.dto';
import { EmailSendDto } from '../shared/dtos/email-send.dto';
import { JwtService } from '../shared/services/jwt.service';
import { EmailService } from '../shared/services/email.service';
import { UserService } from '../shared/services/user.service';
import { ConfigService } from '@nestjs/config';
import { User } from 'src/shared/entities/user.entity';
import { Logger } from '@nestjs/common';

@Controller('account')
export class AccountController {
  private readonly logger = new Logger(AccountController.name);

  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    this.logger.log('AccountController: Initialized');
  }

  // src/account/account.controller.ts - refreshToken মেথড
  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(@Req() req: Request): Promise<UserDto> {
    this.logger.log(`refreshToken: Refresh request for user ID: ${req.user['userId']}`);
    
    // Cookie থেকে token পড়ুন
    const token = req.cookies[this.configService.get<string>('JWT_COOKIES_KEY') || 'eTravelAPIAppRefreshToken'];
    const userId = req.user['userId'];

    this.logger.log(`refreshToken: User ID: ${userId}, Token from cookie: ${token ? 'exists' : 'missing'}`);

    if (!token) {
      this.logger.error('refreshToken: No token found in cookies');
      throw new HttpException('Invalid or expired token, please try to login', HttpStatus.UNAUTHORIZED);
    }

    if (await this.jwtService.isValidRefreshToken(userId, token)) {
      const user = await this.userService.findByIdAsync(userId);
      if (!user) {
        this.logger.error(`refreshToken: User not found for ID: ${userId}`);
        throw new HttpException('Invalid or expired token, please try to login', HttpStatus.UNAUTHORIZED);
      }
      
      this.logger.log(`refreshToken: Token valid for user: ${user.userName}`);
      return await this.createApplicationUserDto(user);
    }

    this.logger.error('refreshToken: Invalid or expired refresh token');
    throw new HttpException('Invalid or expired token, please try to login', HttpStatus.UNAUTHORIZED);
  }

  // src/account/account.controller.ts
  @UseGuards(JwtAuthGuard)
  @Get('refresh-page')
  async refreshPage(@Req() req: Request): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(req.user['username']);
    if (!user) throw new HttpException('User not found', HttpStatus.UNAUTHORIZED);

    // Lockout status চেক করুন
    if (await this.userService.isLockedOutAsync(user)) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new HttpException(
        `Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return await this.createApplicationUserDto(user);
  }

  // src/account/account.controller.ts
  @Post('login')
  async login(@Body() model: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(model.userName);
    if (!user) throw new HttpException('Invalid username or password', HttpStatus.UNAUTHORIZED);

    // প্রথমেই lockout status চেক করুন
    if (await this.userService.isLockedOutAsync(user)) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new HttpException(
        `Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!user.emailConfirmed) {
      throw new HttpException('Please confirm your email.', HttpStatus.UNAUTHORIZED);
    }

    const result = await this.userService.checkPasswordSignInAsync(user, model.password);

    if (result.isLockedOut) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new HttpException(
        `Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    if (!result.succeeded) {
      const remainingAttempts = 3 - user.accessFailedCount;
      throw new HttpException(
        `Invalid username or password. ${remainingAttempts} attempt(s) remaining before lockout.`,
        HttpStatus.UNAUTHORIZED,
      );
    }

    return await this.createApplicationUserDto(user, res);
  }

  @Post('register')
  async register(@Body() model: RegisterDto) {
    if (await this.userService.usersAnyAsync({ email: model.email.toLowerCase() })) {
      throw new HttpException(
        `An existing account is using ${model.email}, please try another email`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const user = await this.userService.createAsync(model);
    await this.userService.addToRoleAsync(user, 'Customer');

    const emailSent = await this.sendConfirmEmailAsync(user);
    if (!emailSent) throw new HttpException('Failed to send email. Please contact admin', HttpStatus.BAD_REQUEST);

    return { title: 'Account Created', message: 'Your account has been created, please confirm your email address' };
  }

  @Put('confirm-email')
  async confirmEmail(@Body() model: ConfirmEmailDto) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) throw new HttpException('This email is not registered', HttpStatus.UNAUTHORIZED);

    if (user.emailConfirmed) {
      throw new HttpException('Your email was confirmed before. Please login.', HttpStatus.BAD_REQUEST);
    }

    const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
    const result = await this.userService.confirmEmailAsync(user, decodedToken);

    if (!result) throw new HttpException('Invalid token. Please try again', HttpStatus.BAD_REQUEST);

    return { title: 'Email confirmed', message: 'You can login now' };
  }

  @Post('resend-email-confirmation-link/:email')
  async resendEmailConfirmationLink(@Param('email') email: string) {
    if (!email) throw new HttpException('Invalid email', HttpStatus.BAD_REQUEST);

    const user = await this.userService.findByEmailAsync(email);
    if (!user) throw new HttpException('This email is not registered', HttpStatus.UNAUTHORIZED);

    if (user.emailConfirmed) {
      throw new HttpException('Your email was confirmed before. Please login.', HttpStatus.BAD_REQUEST);
    }

    const sent = await this.sendConfirmEmailAsync(user);
    if (!sent) throw new HttpException('Failed to send email. Please contact admin', HttpStatus.BAD_REQUEST);

    return { title: 'Confirmation link sent', message: 'Please confirm your email address' };
  }

  @Post('forgot-username-or-password/:email')
  async forgotUsernameOrPassword(@Param('email') email: string) {
    if (!email) throw new HttpException('Invalid email', HttpStatus.BAD_REQUEST);

    const user = await this.userService.findByEmailAsync(email);
    if (!user) throw new HttpException('This email is not registered', HttpStatus.UNAUTHORIZED);

    if (!user.emailConfirmed) {
      throw new HttpException('Please confirm your email first.', HttpStatus.BAD_REQUEST);
    }

    const sent = await this.sendForgotUsernameOrPasswordEmail(user);
    if (!sent) throw new HttpException('Failed to send email. Please contact admin', HttpStatus.BAD_REQUEST);

    return { title: 'Email sent', message: 'Please check your email' };
  }

  @Put('reset-password')
  async resetPassword(@Body() model: ResetPasswordDto) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) throw new HttpException('This email is not registered', HttpStatus.UNAUTHORIZED);

    if (!user.emailConfirmed) {
      throw new HttpException('Please confirm your email first.', HttpStatus.BAD_REQUEST);
    }

    const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
    const result = await this.userService.resetPasswordAsync(user, decodedToken, model.newPassword);

    if (!result) throw new HttpException('Invalid token. Please try again', HttpStatus.BAD_REQUEST);

    return { title: 'Password reset success', message: 'Your password has been reset' };
  }

  // Helpers
  // src/account/account.controller.ts - createApplicationUserDto মেথড
  private async createApplicationUserDto(user: User, @Res({ passthrough: true }) res?: Response): Promise<UserDto> {
    await this.jwtService.saveRefreshToken(user);
    
    // User কে refresh tokens সহ পুনরায় লোড করুন
    user = await this.userService.findByIdAsync(user.id);

    if (!user.refreshTokens || user.refreshTokens.length === 0) {
      throw new Error('Refresh token not generated');
    }

    const latestRefreshToken = user.refreshTokens[user.refreshTokens.length - 1];
    
    // ASP.NET এর মত response এ cookie সেট করুন
    if (res) {
      const cookieOptions = {
        expires: latestRefreshToken.dateExpiresUtc,
        httpOnly: true,
        secure: true, // HTTPS এর জন্য
        sameSite: 'none' as const, // Cross-site requests এর জন্য
      };
      
      res.cookie(
        this.configService.get<string>('JWT_COOKIES_KEY') || 'eTravelAPIAppRefreshToken',
        latestRefreshToken.token,
        cookieOptions
      );
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      jwt: await this.jwtService.createJwt(user),
    };
  }

  private async sendConfirmEmailAsync(user: User): Promise<boolean> {
    let token = await this.userService.generateEmailConfirmationTokenAsync(user);
    token = Buffer.from(token).toString('base64url');
    const url = `${this.configService.get<string>('JWT_CLIENT_URL') || 'http://localhost:4200'}/${this.configService.get<string>('EMAIL_CONFIRM_EMAIL_PATH') || 'account/confirm-email'}?token=${token}&email=${user.email}`;

    const body = `<p>Hello, ${user.firstName} ${user.lastName}</p>
                  <p>Please confirm your email address:</p>
                  <p><a href="${url}">Click here</a></p>`;

    const emailSend = new EmailSendDto(user.email, 'Confirm your email', body);
    return await this.emailService.sendEmailAsync(emailSend);
  }

  private async sendForgotUsernameOrPasswordEmail(user: User): Promise<boolean> {
    let token = await this.userService.generatePasswordResetTokenAsync(user);
    token = Buffer.from(token).toString('base64url');
    const url = `${this.configService.get<string>('JWT_CLIENT_URL') || 'http://localhost:4200'}/${this.configService.get<string>('EMAIL_RESET_PASSWORD_PATH') || 'account/reset-password'}?token=${token}&email=${user.email}`;

    const body = `<p>Hello: ${user.firstName} ${user.lastName}</p>
                  <p>Username: ${user.userName}.</p>
                  <p>Reset password link:</p>
                  <p><a href="${url}">Click here</a></p>`;

    const emailSend = new EmailSendDto(user.email, 'Forgot username or password', body);
    return await this.emailService.sendEmailAsync(emailSend);
  }
}