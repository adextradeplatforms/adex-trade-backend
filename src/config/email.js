import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false, // STARTTLS (required for port 587)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Verify SMTP connection at startup
 * Gmail may still accept mail even if this fails,
 * but this helps debugging.
 */
transporter
  .verify()
  .then(() => console.log('✅ SMTP connection verified'))
  .catch(err => console.error('❌ SMTP verification failed:', err.message));

export default transporter;
