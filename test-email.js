import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Must be Gmail App Password
  },
});

// Test sending email
async function sendTestEmail() {
  try {
    const info = await transporter.sendMail({
      from: `"ADEX Trade Test" <${process.env.EMAIL_FROM}>`,
      to: 'wizjayweb@gmail.com', // change this to your email
      subject: '✅ Test Email from ADEX Trade',
      text: 'This is a test email. If you see this, your SMTP setup works!',
      html: '<h3>This is a test email ✅</h3><p>If you see this, your SMTP setup works!</p>',
    });
    console.log('✅ Test email sent:', info.response);
  } catch (err) {
    console.error('❌ Test email failed:', err.message);
  }
}

sendTestEmail();
