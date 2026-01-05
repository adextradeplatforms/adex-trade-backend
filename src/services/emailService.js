// src/services/emailService.js
import transporter from '../config/email.js';
import i18next from '../config/i18n.js';

/**
 * Send verification email
 * @param {string} email - Recipient email
 * @param {string} verificationToken - Token to verify email
 * @param {string} language - Language code ('en', 'ar', etc.)
 */
export const sendVerificationEmail = async (email, verificationToken, language = 'en') => {
  const t = i18next.getFixedT(language);
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
  try {
    const mailOptions = {
      from: `"ADEX Trade" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: t('email.verificationSubject'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h2>${t('auth.emailVerification')}</h2>
          <p>${t('auth.registerSuccess')}</p>
          <p>
            <a href="${verificationUrl}" style="padding:12px 20px; background:#667eea; color:#fff; text-decoration:none; border-radius:5px;">
              ${t('email.verificationButton')}
            </a>
          </p>
          <p style="font-size:12px; margin-top:10px;">${t('email.linkExpires')}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Verification email sent to ${email}`);
  } catch (error) {
    console.error('❌ Verification email error:', error.message);
    throw error;
  }
};

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} fullName - User's full name
 * @param {string} language - Language code
 */
export const sendWelcomeEmail = async (email, fullName, language = 'en') => {
  const t = i18next.getFixedT(language);

  try {
    const mailOptions = {
      from: `"ADEX Trade" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject: t('email.welcomeSubject'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h2>${t('email.welcomeSubject')}</h2>
          <p>${t('common.hello')} ${fullName},</p>
          <p>${t('auth.emailVerified')}</p>
          <p>${t('common.getStarted')}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
  } catch (error) {
    console.error('❌ Welcome email error:', error.message);
    throw error;
  }
};

/**
 * Send withdrawal notification (approved/rejected)
 * @param {string} email - Recipient email
 * @param {number|string} amount - Withdrawal amount
 * @param {string} status - 'approved' or 'rejected'
 * @param {string} language - Language code
 */
export const sendWithdrawalNotification = async (email, amount, status, language = 'en') => {
  const t = i18next.getFixedT(language);
  const subject = status === 'approved'
    ? t('email.withdrawalApprovedSubject')
    : t('email.withdrawalRejectedSubject');

  try {
    const mailOptions = {
      from: `"ADEX Trade" <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; background:#f5f5f5; padding:20px; border-radius:8px;">
          <h3>${subject}</h3>
          <p>${t('wallet.withdrawalMessage', { amount, status })}</p>
          <p>${t('common.thankYou')}</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal email sent to ${email}`);
  } catch (error) {
    console.error('❌ Withdrawal email error:', error.message);
    throw error;
  }
};

/**
 * Send withdrawal completed email with txHash
 * @param {string} userEmail
 * @param {number} amount
 * @param {string} txHash
 */
export const sendWithdrawalCompletedEmail = async (userEmail, amount, txHash) => {
  try {
    const mailOptions = {
      from: `"ADEX Trade" <${process.env.EMAIL_FROM}>`,
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

          <p>View your transaction on BSCScan:</p>
          <a href="https://bscscan.com/tx/${txHash}" 
             style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
            View on BSCScan
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            The funds should arrive in your wallet within a few minutes.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from ADEX Trade. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal completed email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Withdrawal completed email error:', error.message);
    throw error;
  }
};

/**
 * Send withdrawal rejected email with reason
 * @param {string} userEmail
 * @param {number} amount
 * @param {string} reason
 */
export const sendWithdrawalRejectedEmail = async (userEmail, amount, reason) => {
  try {
    const mailOptions = {
      from: `"ADEX Trade" <${process.env.EMAIL_FROM}>`,
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

          <a href="${process.env.FRONTEND_URL}/wallet/transactions" 
             style="display: inline-block; background-color: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; margin: 10px 0;">
            View Your Wallet
          </a>

          <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
            If you have questions, please contact our support team.
          </p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">

          <p style="color: #6b7280; font-size: 12px;">
            This is an automated message from ADEX Trade. Please do not reply to this email.
          </p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Withdrawal rejected email sent to ${userEmail}`);
  } catch (error) {
    console.error('❌ Withdrawal rejected email error:', error.message);
    throw error;
  }
};
