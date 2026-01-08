import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // ✅ fixed
  },
});

// Verify transporter
if (process.env.NODE_ENV !== 'production') {
  transporter.verify()
    .then(() => console.log('✅ Email service is ready'))
    .catch(err => console.error('❌ Email configuration error:', err.message));
}

export default transporter;
