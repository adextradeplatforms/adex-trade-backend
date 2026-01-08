import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT), // 587
  secure: false, // use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // App password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify()
  .then(() => console.log('✅ Email service is ready'))
  .catch(err => console.error('❌ Email configuration error:', err.message));

export default transporter;
