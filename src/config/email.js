// src/config/email.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST, // smtp.gmail.com
  port: Number(process.env.EMAIL_PORT), // 587
  secure: false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
  tls: {
    rejectUnauthorized: false,
  },
});

// Verify once
if (process.env.NODE_ENV !== 'production') {
  transporter.verify()
    .then(() => console.log('✅ Email service is ready'))
    .catch(err =>
      console.error('❌ Email configuration error:', err.message)
    );
}

export default transporter;
