// src/account/account.controller.ts
import { Controller, Post, Get, Put, Body, Req, UseGuards, Param, HttpStatus, Res, UnauthorizedException, BadRequestException } from '@nestjs/common';
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
import { ResponseUtil } from '../shared/utils/response.util'; // নতুন যোগ করুন

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

  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(@Req() req: Request): Promise<UserDto> {
    this.logger.log(`refreshToken: Refresh request for user ID: ${req.user['userId']}`);
    
    const token = req.cookies[this.configService.get<string>('JWT_COOKIES_KEY') || 'eTravelAPIAppRefreshToken'];
    const userId = req.user['userId'];

    if (!token) {
      throw new UnauthorizedException('Invalid or expired token, please try to login');
    }

    if (await this.jwtService.isValidRefreshToken(userId, token)) {
      const user = await this.userService.findByIdAsync(userId);
      if (!user) {
        throw new UnauthorizedException('Invalid or expired token, please try to login');
      }
      
      return await this.createApplicationUserDto(user);
    }

    throw new UnauthorizedException('Invalid or expired token, please try to login');
  }

  @UseGuards(JwtAuthGuard)
  @Get('refresh-page')
  async refreshPage(@Req() req: Request): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(req.user['username']);
    if (!user) throw new UnauthorizedException('User not found');

    if (await this.userService.isLockedOutAsync(user)) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new UnauthorizedException(`Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`);
    }

    return await this.createApplicationUserDto(user);
  }

  @Post('login')
  async login(@Body() model: LoginDto, @Res({ passthrough: true }) res: Response): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(model.userName);
    if (!user) throw new UnauthorizedException('Invalid username or password');

    if (await this.userService.isLockedOutAsync(user)) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new UnauthorizedException(`Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`);
    }

    if (!user.emailConfirmed) {
      throw new UnauthorizedException('Please confirm your email.');
    }

    const result = await this.userService.checkPasswordSignInAsync(user, model.password);

    if (result.isLockedOut) {
      const lockoutEnd = user.lockoutEnd.toUTCString();
      throw new UnauthorizedException(`Your account has been locked. You should wait until ${lockoutEnd} (UTC time) to be able to login`);
    }

    if (!result.succeeded) {
      const remainingAttempts = 3 - user.accessFailedCount;
      throw new UnauthorizedException(`Invalid username or password. ${remainingAttempts} attempt(s) remaining before lockout.`);
    }

    return await this.createApplicationUserDto(user, res);
  }

  @Post('register')
  async register(@Body() model: RegisterDto, @Res() res: Response) {
    if (await this.userService.usersAnyAsync({ email: model.email.toLowerCase() })) {
      throw new BadRequestException(`An existing account is using ${model.email}, email address. Please try with another email address`);
    }

    const user = await this.userService.createAsync(model);
    await this.userService.addToRoleAsync(user, 'Customer');

    const emailSent = await this.sendConfirmEmailAsync(user);
    if (!emailSent) throw new BadRequestException('Failed to send email. Please contact admin');

    // ResponseUtil ব্যবহার করে simplified response
    return res.status(HttpStatus.OK).json(ResponseUtil.success('Account Created', 'Your account has been created, please confirm your email address'));
  }

  @Put('confirm-email')
  async confirmEmail(@Body() model: ConfirmEmailDto, @Res() res: Response) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');

    if (user.emailConfirmed) {
      throw new BadRequestException('Your email was confirmed before. Please login to your account');
    }

    const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
    const result = await this.userService.confirmEmailAsync(user, decodedToken);

    if (!result) throw new BadRequestException('Invalid token. Please try again');

    return res.status(HttpStatus.OK).json(ResponseUtil.success('Email confirmed', 'Your email address is confirmed. You can login now'));
  }

  @Post('resend-email-confirmation-link/:email')
  async resendEmailConfirmationLink(@Param('email') email: string, @Res() res: Response) {
    if (!email) throw new BadRequestException('Invalid email');

    const user = await this.userService.findByEmailAsync(email);
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');

    if (user.emailConfirmed) {
      throw new BadRequestException('Your email address was confirmed before. Please login to your account');
    }

    const sent = await this.sendConfirmEmailAsync(user);
    if (!sent) throw new BadRequestException('Failed to send email. Please contact admin');

    return res.status(HttpStatus.OK).json(ResponseUtil.success('Confirmation link sent', 'Please confirm your email address'));
  }

  @Post('forgot-username-or-password/:email')
  async forgotUsernameOrPassword(@Param('email') email: string, @Res() res: Response) {
    if (!email) throw new BadRequestException('Invalid email');

    const user = await this.userService.findByEmailAsync(email);
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');

    if (!user.emailConfirmed) {
      throw new BadRequestException('Please confirm your email address first.');
    }

    const sent = await this.sendForgotUsernameOrPasswordEmail(user);
    if (!sent) throw new BadRequestException('Failed to send email. Please contact admin');

    return res.status(HttpStatus.OK).json(ResponseUtil.success('Forgot username or password email sent', 'Please check your email'));
  }

  @Put('reset-password')
  async resetPassword(@Body() model: ResetPasswordDto, @Res() res: Response) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) throw new UnauthorizedException('This email address has not been registered yet');

    if (!user.emailConfirmed) {
      throw new BadRequestException('Please confirm your email address first');
    }

    const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
    const result = await this.userService.resetPasswordAsync(user, decodedToken, model.newPassword);

    if (!result) throw new BadRequestException('Invalid token. Please try again');

    return res.status(HttpStatus.OK).json(ResponseUtil.success('Password reset success', 'Your password has been reset'));
  }

  // Helpers
  private async createApplicationUserDto(user: User, @Res({ passthrough: true }) res?: Response): Promise<UserDto> {
    await this.jwtService.saveRefreshToken(user);
    
    user = await this.userService.findByIdAsync(user.id);

    if (!user.refreshTokens || user.refreshTokens.length === 0) {
      throw new Error('Refresh token not generated');
    }

    const latestRefreshToken = user.refreshTokens[user.refreshTokens.length - 1];
    
    if (res) {
      const cookieOptions = {
        expires: latestRefreshToken.dateExpiresUtc,
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
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