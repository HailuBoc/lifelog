import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import User from "../models/userModel.js";
import { sendOTPEmail } from "../utils/emailService.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret_key";

// Helper: generate JWT
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
};

// POST /api/auth/signup
export const signupUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      reminders = true,
      timezone = "UTC",
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: "Email already registered" });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = Date.now() + 3600000; // 1 hour

    // Create user
    const user = await User.create({
      name,
      email,
      passwordHash,
      reminders,
      timezone,
      otp,
      otpExpires,
      isVerified: false
    });

    // Send verification email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error("Signup OTP Email delivery failed:", emailErr);
    }

    res.status(201).json({
      message: "User registered! Please check your email for verification code.",
      email: user.email
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/login
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    if (!user.isVerified) {
      return res.status(403).json({ 
        message: "Please verify your email first.",
        email: user.email,
        unverified: true 
      });
    }

    const token = generateToken(user._id);

    res.json({
      id: user._id,
      name: user.name,
      email: user.email,
      reminders: user.reminders,
      timezone: user.timezone,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/forgot-password
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      // For security, don't reveal if user exists
      return res.json({ message: "If an account exists, a reset link was sent." });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    user.resetPasswordToken = otp;
    user.resetPasswordExpires = Date.now() + 600000; // 10 minutes for OTP
    await user.save();

    // Send real email
    try {
      await sendOTPEmail(email, otp);
    } catch (emailErr) {
      console.error("OTP Email delivery failed:", emailErr);
      // We still return success-like message for security, but log the error
    }
    
    res.json({ message: "If an account exists, an OTP was sent." });
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/reset-password
export const resetPassword = async (req, res) => {
  try {
    const { email, otp, password } = req.body;

    const user = await User.findOne({
      email,
      resetPasswordToken: otp,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Hash new password
    user.passwordHash = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/verify-otp
export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ 
      email,
      otp,
      otpExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.isVerified = true;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    const token = generateToken(user._id);

    res.json({
      message: "Email verified successfully!",
      id: user._id,
      name: user.name,
      email: user.email,
      token
    });
  } catch (err) {
    console.error("OTP Verification error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

// POST /api/auth/resend-otp
export const resendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpires = Date.now() + 3600000;
    await user.save();

    await sendOTPEmail(email, otp);

    res.json({ message: "A new OTP has been sent to your email." });
  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
