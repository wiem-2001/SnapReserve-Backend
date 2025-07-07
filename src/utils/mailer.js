import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE ,
  host: process.env.HOST || 'smtp.gmail.com',
  port: process.env.PORT_SSL || 465,
   secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendVerificationEmail = async (to, token) => {
  const verificationLink = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;;
  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify your email and activate your account',
    html: `
      <h2>Welcome to SnapReserve!</h2>
      <p>Click the button below to verify your email address:</p>
      <a href="${verificationLink}" style="padding:10px 15px;background:#2d89ef;color:white;text-decoration:none;border-radius:5px;">Verify Email</a>
      <p>This link expires in 24 hours.</p>
    `,
  };

  return transporter.sendMail(mailOptions);
};
export const sendResetPasswordEmail = async ({ to, subject, text,user ,resetUrl}) => {
  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: `
    <h2>Password Reset Request</h2>
    <p>Hello ${user.fullName},</p>
    <p>Click the link below to reset your password. This link will expire in 1 hour.</p>
    <a href="${resetUrl}" target="_blank">Reset Password</a>
    <p>If you didn’t request this, just ignore this email.</p>
  `
  };

  await transporter.sendMail(mailOptions);
};