import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { EmailSendDto } from './dto/email-send.dto';

@Injectable()
export class EmailService {
  private transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'data24host@gmail.com',
        pass: 'buximvejccvacrcd', // From appsettings.json
      },
    });
  }

  async sendEmailAsync(emailSend: EmailSendDto): Promise<boolean> {
    try {
      await this.transporter.sendMail({
        from: 'data24host@gmail.com',
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