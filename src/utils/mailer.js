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
  const verificationLink = `${process.env.BACKEND_URL}/api/auth/verify-email?token=${token}`;

  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Verify Your Email to Activate Your SnapReserve Account',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #021529; padding: 20px; text-align: center;">
          <h1 style="color: #ffd72d; margin: 0;">SnapReserve</h1>
        </div>

        <div style="padding: 20px; background-color: #ffffff;">
          <h2 style="color: #021529;">Confirm Your Email</h2>
          <p>Welcome to <strong>SnapReserve</strong>!</p>
          <p>You're just one step away from securing your spot at top events. Please verify your email address to activate your account.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${verificationLink}" target="_blank" style="
              background-color: #ffd72d;
              color: #021529;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              display: inline-block;
            ">
              Verify My Email
            </a>
          </div>

          <p>This verification link is valid for <strong>24 hours</strong>. If you did not sign up, please ignore this message.</p>

          <p style="margin-top: 40px; color: #888;">Thanks for joining us,<br/>The SnapReserve Team</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} SnapReserve. All rights reserved.
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};

export const sendResetPasswordEmail = async ({ to, subject, text, user, resetUrl }) => {
  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    text,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #021529; padding: 20px; text-align: center;">
          <h1 style="color: #ffd72d; margin: 0;">SnapReserve</h1>
        </div>

        <div style="padding: 20px; background-color: #ffffff;">
          <h2 style="color: #021529;">Reset Your Password</h2>
          <p>Hi <strong>${user}</strong>,</p>
          <p>We received a request to reset your SnapReserve password.</p>
          <p>To continue, click the button below. This link will expire in <strong>1 hour</strong> for security purposes.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" target="_blank" style="
              background-color: #ffd72d;
              color: #021529;
              padding: 12px 24px;
              text-decoration: none;
              border-radius: 5px;
              font-weight: bold;
              display: inline-block;
            ">
              Reset My Password
            </a>
          </div>

          <p>If you didn’t request this, you can safely ignore this email—your password will remain unchanged.</p>

          <p style="margin-top: 40px; color: #888;">Thank you,<br/>The SnapReserve Team</p>
        </div>

        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} SnapReserve. All rights reserved.
        </div>
      </div>
    `
  };

  await transporter.sendMail(mailOptions);
};

export const  sendTicketEmail = async (req,res) => {
  
}