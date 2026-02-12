import express from "express";
import { signupUser, loginUser, forgotPassword, resetPassword, verifyOTP, resendOTP } from "../controllers/authController.js";

const router = express.Router();

router.post("/signup", signupUser);
router.post("/login", loginUser);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/verify-otp", verifyOTP);
router.post("/resend-otp", resendOTP);

export default router;
