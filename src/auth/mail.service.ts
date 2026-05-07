import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  constructor(private readonly configService: ConfigService) {}

  async sendPasswordResetEmail(email: string, resetUrl: string) {
    const transporter = nodemailer.createTransport({
      host: this.configService.get<string>('MAIL_HOST') ?? 'smtp.gmail.com',
      port: Number(this.configService.get<string>('MAIL_PORT') ?? 587),
      secure: this.configService.get<string>('MAIL_SECURE') === 'true',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      throw new InternalServerErrorException('Email service is not configured');
    }

    await transporter.sendMail({
      from: this.configService.get<string>('MAIL_FROM') ?? `"SkillForge" <${process.env.MAIL_USER}>`,
      to: email,
      subject: 'Reset your SkillForge password',
      text: [
        'You requested a password reset for your SkillForge account.',
        '',
        `Open this link to reset your password: ${resetUrl}`,
        '',
        'This link expires in 1 hour. If you did not request this, you can ignore this email.',
      ].join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; color: #0f172a; line-height: 1.6;">
          <h2>Reset your SkillForge password</h2>
          <p>You requested a password reset for your SkillForge account.</p>
          <p>
            <a href="${resetUrl}" style="display: inline-block; padding: 12px 18px; background: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: 700;">
              Reset password
            </a>
          </p>
          <p>This link expires in 1 hour. If you did not request this, you can ignore this email.</p>
        </div>
      `,
    });
  }

  private get mailUser() {
    return (
      this.configService.get<string>('MAIL_USER') ??
      this.configService.get<string>('SMTP_USER') ??
      this.configService.get<string>('USER')
    );
  }

  private get mailPass() {
    return (
      this.configService.get<string>('MAIL_PASS') ??
      this.configService.get<string>('SMTP_PASS') ??
      this.configService.get<string>('PASS')
    );
  }
}
