export class EmailSendDto {
  constructor(to: string, subject: string, body: string) {
    this.to = to;
    this.subject = subject;
    this.body = body;
  }

  to: string;
  subject: string;
  body: string;
}