import nodemailer from "nodemailer";
import 'dotenv/config'; // loads your .env variables

const sendTestEmail = async () => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: false, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL_USER, // your Gmail
        pass: process.env.EMAIL_PASS, // your App Password (with spaces)
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"Adex Trade" <${process.env.EMAIL_USER}>`,
      to: "wizjayweb@gmail.com", // your test recipient
      subject: "Test Email from Backend",
      text: "This is a test email to confirm Gmail verification works.",
    });

    console.log("✅ Message sent:", info.messageId);
  } catch (err) {
    console.error("❌ Email failed:", err);
  }
};

sendTestEmail();
