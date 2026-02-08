import nodemailer from 'nodemailer';
import { env } from './env.js';

/**
 * Email transporter configured for Google Workspace SMTP
 *
 * Requires an App Password from Google:
 * 1. Go to Google Account > Security > 2-Step Verification (must be enabled)
 * 2. At the bottom, click "App passwords"
 * 3. Generate a new app password for "Mail"
 * 4. Use that 16-character password as SMTP_PASS
 */
export const emailTransporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
});

/**
 * Verify SMTP connection on startup (optional, call from server.ts if desired)
 */
export async function verifyEmailConnection(): Promise<boolean> {
  try {
    await emailTransporter.verify();
    console.log('SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('SMTP connection failed:', error);
    return false;
  }
}
