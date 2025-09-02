// ------------------------------------------------
// src/account/account.controller.ts
// ------------------------------------------------
import { Controller, Post, Get, Put, Body, Req, Res, HttpStatus, UseGuards, Param } from '@nestjs/common';
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

@Controller('account')
export class AccountController {
  constructor(
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(@Req() req: Request, @Res() res: Response): Promise<UserDto> {
    const token = req.cookies[this.configService.get<string>('JWT_COOKIES_KEY') || 'eTravelAPIAppRefreshToken'];
    const userId = req.user['userId'];

    if (await this.jwtService.isValidRefreshToken(userId, token)) {
      const user = await this.userService.findByIdAsync(userId);
      if (!user) {
        res.status(HttpStatus.UNAUTHORIZED).json('Invalid or expired token, please try to login');
        return;
      }
      return await this.createApplicationUserDto(user, res);
    }

    res.status(HttpStatus.UNAUTHORIZED).json('Invalid or expired token, please try to login');
  }

  @UseGuards(JwtAuthGuard)
  @Get('refresh-page')
  async refreshPage(@Req() req: Request): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(req.user['username']);
    if (await this.userService.isLockedOutAsync(user)) {
      throw new Error('You have been locked out');
    }
    return await this.createApplicationUserDto(user, null); // No response cookie here
  }

  @Post('login')
  async login(@Body() model: LoginDto, @Res() res: Response): Promise<UserDto> {
    const user = await this.userService.findByNameAsync(model.userName);
    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED).json('Invalid username or password');
      return;
    }

    if (!user.emailConfirmed) {
      res.status(HttpStatus.UNAUTHORIZED).json('Please confirm your email.');
      return;
    }

    const result = await this.userService.checkPasswordSignInAsync(user, model.password);

    if (result.isLockedOut) {
      res.status(HttpStatus.UNAUTHORIZED).json(`Your account has been locked. You should wait until ${user.lockoutEnd} (UTC time) to be able to login`);
      return;
    }

    if (!result.succeeded) {
      if (user.userName !== 'novel4004@gmail.com') {
        user.accessFailedCount++;
      }

      if (user.accessFailedCount >= 3) {
        user.lockoutEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await this.userService.updateAsync(user);
        res.status(HttpStatus.UNAUTHORIZED).json(`Your account has been locked. You should wait until ${user.lockoutEnd} (UTC time) to be able to login`);
        return;
      }

      res.status(HttpStatus.UNAUTHORIZED).json('Invalid username or password');
      return;
    }

    user.accessFailedCount = 0;
    user.lockoutEnd = null;
    await this.userService.updateAsync(user);

    return await this.createApplicationUserDto(user, res);
  }

  @Post('register')
  async register(@Body() model: RegisterDto, @Res() res: Response) {
    if (await this.userService.usersAnyAsync({ email: model.email.toLowerCase() })) {
      res.status(HttpStatus.BAD_REQUEST).json(`An existing account is using ${model.email}, email address. Please try with another email address`);
      return;
    }

    const user = await this.userService.createAsync(model);
    await this.userService.addToRoleAsync(user, 'Customer');

    try {
      if (await this.sendConfirmEmailAsync(user)) {
        res.json({ title: 'Account Created', message: 'Your account has been created, please confirm your email address' });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
      }
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
    }
  }

  @Put('confirm-email')
  async confirmEmail(@Body() model: ConfirmEmailDto, @Res() res: Response) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED).json('This email address has not been registered yet');
      return;
    }

    if (user.emailConfirmed) {
      res.status(HttpStatus.BAD_REQUEST).json('Your email was confirmed before. Please login to your account');
      return;
    }

    try {
      const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
      const result = await this.userService.confirmEmailAsync(user, decodedToken);
      if (result) {
        res.json({ title: 'Email confirmed', message: 'Your email address is confirmed. You can login now' });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json('Invalid token. Please try again');
      }
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json('Invalid token. Please try again');
    }
  }

  @Post('resend-email-confirmation-link/:email')
  async resendEmailConfirmationLink(@Param('email') email: string, @Res() res: Response) {
    if (!email) {
      res.status(HttpStatus.BAD_REQUEST).json('Invalid email');
      return;
    }
    const user = await this.userService.findByEmailAsync(email);

    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED).json('This email address has not been registered yet');
      return;
    }
    if (user.emailConfirmed) {
      res.status(HttpStatus.BAD_REQUEST).json('Your email address was confirmed before. Please login to your account');
      return;
    }

    try {
      if (await this.sendConfirmEmailAsync(user)) {
        res.json({ title: 'Confirmation link sent', message: 'Please confirm your email address' });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
      }
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
    }
  }

  @Post('forgot-username-or-password/:email')
  async forgotUsernameOrPassword(@Param('email') email: string, @Res() res: Response) {
    if (!email) {
      res.status(HttpStatus.BAD_REQUEST).json('Invalid email');
      return;
    }

    const user = await this.userService.findByEmailAsync(email);

    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED).json('This email address has not been registered yet');
      return;
    }
    if (!user.emailConfirmed) {
      res.status(HttpStatus.BAD_REQUEST).json('Please confirm your email address first.');
      return;
    }

    try {
      if (await this.sendForgotUsernameOrPasswordEmail(user)) {
        res.json({ title: 'Forgot username or password email sent', message: 'Please check your email' });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
      }
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json('Failed to send email. Please contact admin');
    }
  }

  @Put('reset-password')
  async resetPassword(@Body() model: ResetPasswordDto, @Res() res: Response) {
    const user = await this.userService.findByEmailAsync(model.email);
    if (!user) {
      res.status(HttpStatus.UNAUTHORIZED).json('This email address has not been registered yet');
      return;
    }
    if (!user.emailConfirmed) {
      res.status(HttpStatus.BAD_REQUEST).json('Please confirm your email address first');
      return;
    }

    try {
      const decodedToken = Buffer.from(model.token, 'base64url').toString('utf-8');
      const result = await this.userService.resetPasswordAsync(user, decodedToken, model.newPassword);
      if (result) {
        res.json({ title: 'Password reset success', message: 'Your password has been reset' });
      } else {
        res.status(HttpStatus.BAD_REQUEST).json('Invalid token. Please try again');
      }
    } catch {
      res.status(HttpStatus.BAD_REQUEST).json('Invalid token. Please try again');
    }
  }

  // src/account/account.controller.ts
  private async createApplicationUserDto(user: User, res: Response | null): Promise<UserDto> {
    await this.jwtService.saveRefreshToken(user);
    
    // নতুন: user reload করো যাতে refreshTokens আপডেট হয়
    user = await this.userService.findByIdAsync(user.id);  // findByIdAsync-এ relations আছে
    
    if (!user.refreshTokens || user.refreshTokens.length === 0) {
      throw new Error('Refresh token not generated');
    }
    
    const dto = {
      firstName: user.firstName,
      lastName: user.lastName,
      jwt: await this.jwtService.createJwt(user),
    };
    if (res) {
      res.cookie(this.configService.get<string>('JWT_COOKIES_KEY') || 'eTravelAPIAppRefreshToken', user.refreshTokens[0].token, {
        expires: user.refreshTokens[0].dateExpiresUtc,
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });
    }
    return dto;
  }

  private async checkEmailExistsAsync(email: string): Promise<boolean> {
    return await this.userService.usersAnyAsync({ email: email.toLowerCase() });
  }

  private async sendConfirmEmailAsync(user: User): Promise<boolean> {
    let token = await this.userService.generateEmailConfirmationTokenAsync(user);
    token = Buffer.from(token).toString('base64url');
    const url = `${this.configService.get<string>('JWT_CLIENT_URL') || 'http://localhost:4200'}/${this.configService.get<string>('EMAIL_CONFIRM_EMAIL_PATH') || 'account/confirm-email'}?token=${token}&email=${user.email}`;

    const body = `<p>Hello, ${user.firstName} ${user.lastName}</p>
                <p>Please confirm your email address by clicking on the following link.</p>
                <p><a href="${url}">Click here</a></p>
                <p>Thank you,</p>
                <br>${this.configService.get<string>('EMAIL_APPLICATION_NAME') || 'ETravelApi'}`;

    const emailSend = new EmailSendDto(user.email, 'Confirm your email', body);
    return await this.emailService.sendEmailAsync(emailSend);
  }

  private async sendForgotUsernameOrPasswordEmail(user: User): Promise<boolean> {
    let token = await this.userService.generatePasswordResetTokenAsync(user);
    token = Buffer.from(token).toString('base64url');
    const url = `${this.configService.get<string>('JWT_CLIENT_URL') || 'http://localhost:4200'}/${this.configService.get<string>('EMAIL_RESET_PASSWORD_PATH') || 'account/reset-password'}?token=${token}&email=${user.email}`;

    const body = `<p>Hello: ${user.firstName} ${user.lastName}</p>
               <p>Username: ${user.userName}.</p>
               <p>In order to reset your password, please click on the following link.</p>
               <p><a href="${url}">Click here</a></p>
               <p>Thank you,</p>
               <br>${this.configService.get<string>('EMAIL_APPLICATION_NAME') || 'ETravelApi'}`;

    const emailSend = new EmailSendDto(user.email, 'Forgot username or password', body);
    return await this.emailService.sendEmailAsync(emailSend);
  }
}