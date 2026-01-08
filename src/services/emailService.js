// src/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import i18next from '../config/i18n.js';

dotenv.config();

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: Number(process.env.EMAIL_PORT) === 465, // true for 465, false for 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter
if (process.env.NODE_ENV !== 'production') {
  transporter.verify()
    .then(() => console.log('✅ Email service is ready'))
    .catch(err => console.error('❌ Email configuration error:', err.message));
}

/**
 * Send verification email
 */
export const sendVerificationEmail = async (email, verificationToken, language = 'en') => {
  const t = i18next.getFixedT(language);
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t('email.verificationSubject') || 'Verify Your Email',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h2>${t('auth.emailVerification') || 'Email Verification'}</h2>
          <p>${t('auth.registerSuccess') || 'Thank you for registering!'}</p>
          <p>
            <a href="${verificationUrl}" style="padding:12px 20px; background:#667eea; color:#fff; text-decoration:none; border-radius:5px;">
              ${t('email.verificationButton') || 'Verify Email'}
            </a>
          </p>
          <p style="font-size:12px; margin-top:10px;">${t('email.linkExpires') || 'Link expires in 24 hours.'}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Verification email error:', error);
    throw error;
  }
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (email, fullName, language = 'en') => {
  const t = i18next.getFixedT(language);

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject: t('email.welcomeSubject') || 'Welcome to ADEX Trade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h2>${t('email.welcomeSubject') || 'Welcome!'}</h2>
          <p>${t('common.hello') || 'Hello'} ${fullName},</p>
          <p>${t('auth.emailVerified') || 'Your email has been verified successfully.'}</p>
          <p>${t('common.getStarted') || 'Get started with your trading journey today!'}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error('❌ Welcome email error:', error);
    throw error;
  }
};

/**
 * Send withdrawal notification (approved/rejected)
 */
export const sendWithdrawalNotification = async (email, amount, status, language = 'en') => {
  const t = i18next.getFixedT(language);
  const subject = status === 'approved'
    ? t('email.withdrawalApprovedSubject') || 'Withdrawal Approved'
    : t('email.withdrawalRejectedSubject') || 'Withdrawal Rejected';

  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h3>${subject}</h3>
          <p>${t('wallet.withdrawalMessage', { amount, status }) || `Your withdrawal of ${amount} USDT is ${status}.`}</p>
          <p>${t('common.thankYou') || 'Thank you!'}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal email sent to ${email}`);
  } catch (error) {
    console.error('❌ Withdrawal email error:', error);
    throw error;
  }
};

/**
 * Send withdrawal completed email with txHash
 */
export const sendWithdrawalCompletedEmail = async (userEmail, amount, txHash) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: '✅ Withdrawal Completed - ADEX Trade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #10b981;">Withdrawal Completed Successfully! 🎉</h2>
          <p>Your withdrawal has been processed and sent to your wallet.</p>

          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
            <p><strong>Amount:</strong> ${amount} USDT</p>
            <p><strong>Status:</strong> <span style="color: #10b981;">Completed</span></p>
            <p><strong>Transaction Hash:</strong></p>
            <p style="word-break: break-all; font-family: monospace; font-size: 12px;">${txHash}</p>
          </div>

          <a href="https://bscscan.com/tx/${txHash}" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
            View on BSCScan
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">The funds should arrive in your wallet within a few minutes.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message from ADEX Trade. Please do not reply to this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal completed email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Withdrawal completed email error:', error);
    throw error;
  }
};

/**
 * Send withdrawal rejected email with reason
 */
export const sendWithdrawalRejectedEmail = async (userEmail, amount, reason) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: userEmail,
      subject: '❌ Withdrawal Rejected - ADEX Trade',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #ef4444;">Withdrawal Rejected</h2>
          <p>Your withdrawal request has been rejected by our admin team.</p>

          <div style="background-color: #fef2f2; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ef4444;">
            <p><strong>Amount:</strong> ${amount} USDT</p>
            <p><strong>Reason:</strong> ${reason}</p>
            <p><strong>Status:</strong> Funds returned to your wallet</p>
          </div>

          <a href="${process.env.FRONTEND_URL}/wallet/transactions" style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
            View Your Wallet
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">If you have questions, please contact our support team.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated message from ADEX Trade. Please do not reply to this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal rejected email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Withdrawal rejected email error:', error);
    throw error;
  }
};

export default transporter;
