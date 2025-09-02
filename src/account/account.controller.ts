import { Controller, Post, Body, Get, Req, UseGuards, HttpCode, Put, Param } from '@nestjs/common';
import { AccountService } from './account.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UserDto } from './dto/user.dto';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Request } from 'express';

@Controller('api/account')
export class AccountController {
  constructor(private accountService: AccountService) {}

  @Post('login')
  @HttpCode(200)
  async login(@Body() loginDto: LoginDto): Promise<UserDto> {
    return this.accountService.login(loginDto);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<any> {
    return this.accountService.register(registerDto);
  }

  @Post('refresh-token')
  @UseGuards(JwtAuthGuard)
  async refreshToken(@Req() request: Request): Promise<UserDto> {
    const userId = request.user['sub'];
    const token = request.cookies['eTravelAPIAppRefreshToken'];
    return this.accountService.refreshToken(userId, token);
  }

  @Get('refresh-page')
  @UseGuards(JwtAuthGuard)
  async refreshPage(@Req() request: Request): Promise<UserDto> {
    const email = request.user['email'];
    return this.accountService.refreshPage(email);
  }

  @Put('confirm-email')
  async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto): Promise<any> {
    return this.accountService.confirmEmail(confirmEmailDto);
  }

  @Post('resend-email-confirmation-link/:email')
  async resendEmailConfirmationLink(@Param('email') email: string): Promise<any> {
    return this.accountService.resendEmailConfirmationLink(email);
  }

  @Post('forgot-username-or-password/:email')
  async forgotUsernameOrPassword(@Param('email') email: string): Promise<any> {
    return this.accountService.forgotUsernameOrPassword(email);
  }

  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<any> {
    return this.accountService.resetPassword(resetPasswordDto);
  }
}