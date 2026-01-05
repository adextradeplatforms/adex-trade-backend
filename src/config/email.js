// src/config/email.js

import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // auto-fix
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// Verify connection (safe in dev)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify()
    .then(() => console.log('✅ Email service is ready'))
    .catch((error) =>
      console.error('❌ Email configuration error:', error.message)
    );
}

export default transporter;
