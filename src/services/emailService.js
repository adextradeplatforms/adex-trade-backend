// src/services/emailService.js
import transporter from '../config/email.js';
import i18next from '../config/i18n.js';

/**
 * Send verification email
 */
export const sendVerificationEmail = async (
  email,
  verificationToken,
  language = 'en'
) => {
  const t = i18next.getFixedT(language);
  const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;

  const mailOptions = {
    from: process.env.EMAIL_USER, // MUST be Gmail sender
    to: email,
    subject: t('email.verificationSubject') || 'Verify Your Email',
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto; padding:20px;">
        <h2>Email Verification</h2>
        <p>Thank you for registering.</p>
        <a href="${verificationUrl}"
           style="display:inline-block;padding:12px 20px;background:#667eea;color:#fff;text-decoration:none;border-radius:5px;">
          Verify Email
        </a>
        <p style="font-size:12px;">Link expires in 24 hours</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
  console.log(`✅ Verification email sent to ${email}`);
};

/**
 * Send welcome email
 */
export const sendWelcomeEmail = async (
  email,
  fullName,
  language = 'en'
) => {
  const t = i18next.getFixedT(language);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject: t('email.welcomeSubject') || 'Welcome to ADEX Trade',
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto;">
        <h2>Welcome 🎉</h2>
        <p>Hello ${fullName},</p>
        <p>Your email has been verified successfully.</p>
      </div>
    `,
  });

  console.log(`✅ Welcome email sent to ${email}`);
};

/**
 * Withdrawal status email
 */
export const sendWithdrawalNotification = async (
  email,
  amount,
  status,
  language = 'en'
) => {
  const t = i18next.getFixedT(language);
  const subject =
    status === 'approved'
      ? 'Withdrawal Approved'
      : 'Withdrawal Rejected';

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto;">
        <h3>${subject}</h3>
        <p>Your withdrawal of ${amount} USDT is ${status}.</p>
      </div>
    `,
  });

  console.log(`✅ Withdrawal email sent to ${email}`);
};

/**
 * Withdrawal completed email
 */
export const sendWithdrawalCompletedEmail = async (
  userEmail,
  amount,
  txHash
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: '✅ Withdrawal Completed - ADEX Trade',
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto;">
        <h2>Withdrawal Completed 🎉</h2>
        <p>Amount: ${amount} USDT</p>
        <p>Transaction Hash:</p>
        <p style="word-break:break-all;font-family:monospace;">
          ${txHash}
        </p>
        <a href="https://bscscan.com/tx/${txHash}">
          View on BSCScan
        </a>
      </div>
    `,
  });

  console.log(`✅ Withdrawal completed email sent`);
};

/**
 * Withdrawal rejected email
 */
export const sendWithdrawalRejectedEmail = async (
  userEmail,
  amount,
  reason
) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: userEmail,
    subject: '❌ Withdrawal Rejected - ADEX Trade',
    html: `
      <div style="font-family: Arial; max-width:600px; margin:auto;">
        <h2>Withdrawal Rejected</h2>
        <p>Amount: ${amount} USDT</p>
        <p>Reason: ${reason}</p>
      </div>
    `,
  });

  console.log(`✅ Withdrawal rejected email sent`);
};
