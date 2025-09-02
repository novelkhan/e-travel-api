import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

interface EmailSendDto {
  to: string;
  subject: string;
  body: string;
}

@Injectable()
export class EmailService {
  private transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('GMAIL_HOST'),
      port: parseInt(this.configService.get('GMAIL_PORT')),
      secure: false,
      auth: {
        user: this.configService.get('GMAIL_EMAIL_ADDRESS'),
        pass: this.configService.get('GMAIL_TWO_FACTOR_PASSWORD'),
      },
    });
  }

  async sendEmail(emailSend: EmailSendDto): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: this.configService.get('GMAIL_EMAIL_ADDRESS'),
        to: emailSend.to,
        subject: emailSend.subject,
        html: emailSend.body,
      });
      return true;
    } catch (error) {
      console.error(error);
      return false;
    }
  }
}