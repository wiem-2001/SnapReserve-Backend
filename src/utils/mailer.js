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

export const sendTicketEmail = async ({ to, userName, tickets, orderDate, totalAmount }) => {
  const ticketsHtml = tickets.map(ticket => {
    const qrBlocks = ticket.qrCodeUrls.map((url, index) => `
      <div style="margin:10px 0; padding:15px;">
     
        <div style="margin-bottom:15px; border-bottom:1px solid #f0f0f0; padding-bottom:10px;">
          <h3 style="margin:0 0 5px 0; color:#021529;">${ticket.eventTitle}</h3>
          <p style="margin:3px 0; font-size:14px;">
            <strong>Date:</strong> ${new Date(ticket.eventDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </p>
          <p style="margin:3px 0; font-size:14px;">
            <strong>Location:</strong> ${ticket.eventLocation}
          </p>
        </div>
       
        <div style="margin-bottom:10px;">
          <p style="margin:5px 0; font-weight:bold; font-size:16px;">
            ${ticket.tierName} Ticket
          </p>
          <p style="margin:5px 0; font-size:14px;">
            <strong>Price:</strong> $${ticket.price.toFixed(2)}
          </p>
        </div>
        
        <div style="text-align:center; margin:15px 0;">
          <pre style="font-family:monospace; line-height:1; margin:10px auto; color:#021529; font-size:8px; white-space:pre-wrap; display:inline-block;">
${ticket.asciiQRs[index]}
          </pre>
          <img src="${url}" alt="QR Code" width="150" 
               style="display:block; margin:10px auto; border:1px solid #ddd;"
               onerror="this.style.display='none'"/>
        </div>
     
        <div style="font-size:12px; color:#666; text-align:center;">
          <p style="margin:5px 0;">
            <strong>Ticket ID:</strong> ${ticket.ticketIds[index]}
          </p>
          <p style="margin:5px 0;">
            <a href="${ticket.textUrls[index]}" style="color:#0066cc;">View ticket online</a>
          </p>
        </div>
      </div>
    `).join('');

    return `
      <div style="border:1px solid #ddd; margin-bottom:20px; padding:0; border-radius:6px; overflow:hidden;">
        <div style="padding:15px;">
          ${qrBlocks}
        </div>
      </div>
    `;
  }).join('');

  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Your SnapReserve Tickets`,
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #021529; padding: 20px; text-align: center;">
          <h1 style="color: #ffd72d; margin: 0;">SnapReserve</h1>
        </div>
        <div style="padding: 20px; background-color: #ffffff;">
          <h2 style="color: #021529;">Hello, ${userName}</h2>
          <p>Thank you for your purchase on <strong>${orderDate.toLocaleDateString()}</strong>.</p>
          <p style="margin-bottom: 0;">
            Below are your digital tickets. Each ticket includes:
          </p>
          <ul style="margin-top: 8px; padding-left: 20px;">
            <li>A scannable QR code for entry</li>
            <li>Event details (date, location)</li>
            <li>Ticket type and unique ID</li>
          </ul>
          ${ticketsHtml}
          <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #eee;">
            <p style="font-weight: bold; font-size: 16px; color: #021529; text-align: right;">
              Total Paid: $${totalAmount.toFixed(2)}
            </p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} SnapReserve. All rights reserved.
        </div>
      </div>
    `,
  };
    await transporter.sendMail(mailOptions);
};

export const sendSuspiciousActivityEmail = async (to) => {

  const mailOptions = {
    from: `"SnapReserve" <${process.env.EMAIL_USER}>`,
    to,
    subject: 'Suspicious Activity Detected on Your SnapReserve Account',
    html: `
      <div style="font-family: 'Segoe UI', sans-serif; max-width: 600px; margin: auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #021529; padding: 20px; text-align: center;">
          <h1 style="color: #ffd72d; margin: 0;">SnapReserve</h1>
        </div>

        <div style="padding: 20px; background-color: #ffffff;">
          <h2 style="color: #d93025;">Your Transaction Was Blocked</h2>
          <p>We’ve detected potentially suspicious activity on your account and have blocked your recent attempt to reserve tickets as a precaution.</p>

          <p>If you believe this was a mistake, please contact our support team so we can verify and assist you further.</p>
          <p style="margin-top: 40px; color: #888;">We’re here to help,<br/>The SnapReserve Team</p>
        </div>
        <div style="background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; color: #999;">
          &copy; ${new Date().getFullYear()} SnapReserve. All rights reserved.
        </div>
      </div>
    `
  };

  return transporter.sendMail(mailOptions);
};
