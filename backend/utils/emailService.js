import nodemailer from "nodemailer";

/**
 * Sends a 6-digit OTP email to the user.
 * For local development, this defaults to Ethereal (mock) if SMTP_USER is not set.
 */
export const sendOTPEmail = async (email, otp) => {
  try {
    let transporter;

    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      // Real SMTP config
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: process.env.SMTP_PORT || 465,
        secure: true,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
    } else {
      // Ethereal (Testing) fallback
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false, 
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[EMAIL_DEBUG] Using Ethereal account: ${testAccount.user}`);
    }

    const info = await transporter.sendMail({
      from: '"LifeLog App" <no-reply@lifelogapp.com>',
      to: email,
      subject: "Your LifeLog Password Reset OTP",
      text: `Your password reset code is: ${otp}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
          <h2 style="color: #6366f1;">LifeLog Reset Request</h2>
          <p>You requested to reset your password. Use the following 6-digit code to proceed:</p>
          <div style="font-size: 32px; font-weight: bold; letter-spacing: 0.2em; text-align: center; padding: 20px; background: #f8fafc; color: #1e293b; border-radius: 8px; margin: 20px 0;">
            ${otp}
          </div>
          <p style="color: #64748b; font-size: 14px;">This code will expire in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (!process.env.SMTP_USER) {
      console.log(`[EMAIL_DEBUG] Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (err) {
    console.error("Email send failure:", err);
    throw new Error("Failed to send OTP email");
  }
};
