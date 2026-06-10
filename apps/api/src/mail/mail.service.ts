import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail = '"Aero Support" <support@aerodeploy.app>';
  private dashboardUrl = 'http://localhost:3001';
  private apiUrl = 'http://localhost:3500';

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.dashboardUrl = this.configService.get<string>(
      'DASHBOARD_URL',
      'http://localhost:3001',
    );
    this.apiUrl = this.configService.get<string>(
      'API_URL',
      'http://localhost:3500',
    );
    this.fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      '"Aero Support" <support@aerodeploy.app>',
    );

    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<string>('SMTP_PORT');
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && port && user && pass) {
      this.logger.log(
        `SMTP configured. Initializing mailer transport connected to ${host}:${port}`,
      );
      this.transporter = nodemailer.createTransport({
        host,
        port: parseInt(port, 10),
        secure: parseInt(port, 10) === 465, // True for 465, false for other ports
        auth: {
          user,
          pass,
        },
      });
    } else {
      this.logger.warn(
        'SMTP credentials missing from environment. Using console logging fallback for emails.',
      );
    }
  }

  /**
   * Helper to load HTML templates and replace placeholder keys
   */
  private getTemplate(
    fileName: string,
    replacements: Record<string, string>,
  ): string {
    try {
      const filePath = path.join(process.cwd(), 'public', 'emails', fileName);
      let content = fs.readFileSync(filePath, 'utf8');

      const allReplacements = {
        apiUrl: this.apiUrl,
        ...replacements,
      };

      for (const [key, value] of Object.entries(allReplacements)) {
        content = content.replace(new RegExp(`{{${key}}}`, 'g'), value);
      }
      return content;
    } catch (err) {
      this.logger.error(`Failed to load template ${fileName}:`, err);
      // Fallback content in case template file loading fails
      return `<p>${Object.entries(replacements)
        .map(([k, v]) => `${k}: ${v}`)
        .join('<br>')}</p>`;
    }
  }

  /**
   * Send the email confirmation verification link
   */
  async sendVerificationEmail(
    toEmail: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verificationUrl = `${this.dashboardUrl}/verify-email?token=${token}`;
    const subject = 'Verify your email address';

    const html = this.getTemplate('verification.html', {
      name,
      verificationUrl,
    });

    await this.sendMail({
      to: toEmail,
      subject,
      text: `Hello ${name},\n\nPlease verify your email address by visiting: ${verificationUrl}`,
      html,
    });
  }

  /**
   * Send the forgot password verification PIN code
   */
  async sendForgotPasswordPin(
    toEmail: string,
    name: string,
    pin: string,
  ): Promise<void> {
    const subject = 'Aero Account Password Reset';

    const html = this.getTemplate('forgot-password.html', {
      name,
      pin,
    });

    await this.sendMail({
      to: toEmail,
      subject,
      text: `Hello ${name},\n\nYour password reset PIN is: ${pin}\n\nThis code is valid for 15 minutes.`,
      html,
    });
  }

  /**
   * Internal sender router
   */
  private async sendMail(options: {
    to: string;
    subject: string;
    text: string;
    html: string;
  }) {
    if (this.transporter) {
      try {
        await this.transporter.sendMail({
          from: this.fromEmail,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
        this.logger.log(
          `Email dispatched successfully to ${options.to} (Subject: "${options.subject}")`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to dispatch email to ${options.to} via SMTP:`,
          err,
        );
      }
    } else {
      // Console logging fallback format
      this.logger.log(`
┌────────────────────────────────────────────────────────┐
│                    OUTGOING EMAIL                      │
├────────────────────────────────────────────────────────┤
│ TO:      ${options.to}
│ SUBJECT: ${options.subject}
│ FROM:    ${this.fromEmail}
├────────────────────────────────────────────────────────┤
│ TEXT CONTENT:
│ ${options.text.trim()}
└────────────────────────────────────────────────────────┘
      `);
    }
  }
}
