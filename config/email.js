import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: false, // TLS false for port 587
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify connection configuration (optional)
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email transporter is ready");
  }
});
