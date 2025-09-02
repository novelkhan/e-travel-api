import { Controller, Post, Get, Put, Body, Request, Response, Param, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';;
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ConfirmEmailDto } from './dto/confirm-email.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@ApiTags('account')
@Controller('api/account')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @UseGuards(JwtAuthGuard)
  @Post('refresh-token')
  async refreshToken(@Request() req, @Response({ passthrough: true }) res) {
    return this.authService.refreshToken(req, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('refresh-page')
  async refreshPage(@Request() req) {
    return this.authService.refreshPage(req.user);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto, @Response({ passthrough: true }) res) {
    return this.authService.login(loginDto, res);
  }

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Put('confirm-email')
  async confirmEmail(@Body() confirmEmailDto: ConfirmEmailDto) {
    return this.authService.confirmEmail(confirmEmailDto);
  }

  @Post('resend-email-confirmation-link/:email')
  async resendEmailConfirmationLink(@Param('email') email: string) {
    return this.authService.resendEmailConfirmationLink(email);
  }

  @Post('forgot-username-or-password/:email')
  async forgotUsernameOrPassword(@Param('email') email: string) {
    return this.authService.forgotUsernameOrPassword(email);
  }

  @Put('reset-password')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }
}