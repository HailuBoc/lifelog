import nodemailer from "nodemailer";

/**
 * Sends a 6-digit OTP email to the user.
 * Expects SMTP_USER and SMTP_PASS to be set in environment.
 */
export const sendOTPEmail = async (email, otp) => {
  console.log(`[DEBUG] SMTP_USER: ${process.env.SMTP_USER ? "FOUND" : "MISSING"}`);
  console.log(`[DEBUG] SMTP_PASS: ${process.env.SMTP_PASS ? "FOUND" : "MISSING"}`);

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.error("[CRITICAL] SMTP credentials missing in .env");
    throw new Error("Email service not configured. Please contact support.");
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"),
      secure: process.env.SMTP_SECURE !== "false", // Default to true for port 465
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: `"LifeLog App" <${process.env.SMTP_USER}>`,
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

    console.log(`[SUCCESS] OTP email sent to ${email}`);
    return true;
  } catch (err) {
    console.error("Email send failure:", err);
    throw new Error("Failed to send OTP email. Please try again later.");
  }
};
