// src/shared/services/email.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { EmailSendDto } from '../dtos/email-send.dto';
import { Logger } from '@nestjs/common'; // অ্যাড

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name); // লগ অ্যাড

  constructor(private readonly configService: ConfigService) {}

  async sendEmailAsync(emailSend: EmailSendDto): Promise<boolean> {
    this.logger.log(`sendEmailAsync: Sending email to: ${emailSend.to}, subject: ${emailSend.subject}`);
    // Use Gmail as default, like in ASP.NET
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('GMAIL_HOST') || 'smtp.gmail.com',
      port: this.configService.get<number>('GMAIL_PORT') || 587,
      secure: false,
      auth: {
        user: this.configService.get<string>('GMAIL_EMAIL_ADDRESS') || 'data24host@gmail.com',
        pass: this.configService.get<string>('GMAIL_TWO_FACTOR_PASSWORD') || 'buximvejccvacrcd',
      },
    });

    const mailOptions = {
      from: this.configService.get<string>('EMAIL_FROM') || 'novel4004@gmail.com',
      to: emailSend.to,
      subject: emailSend.subject,
      html: emailSend.body,
    };

    try {
      await transporter.sendMail(mailOptions);
      this.logger.log(`sendEmailAsync: Email sent successfully to ${emailSend.to}`);
      return true;
    } catch (error) {
      this.logger.error(`sendEmailAsync: Error sending email - ${error.message}`);
      return false;
    }
  }
}