const express = require("express");
const router = express.Router();
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const axios = require("axios");

const User = require("../models/User");
const Otp = require("../models/Otp");

// =========================
// RATE LIMITER
// =========================
const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many OTP requests. Try again later." },
});

// =========================
// GENERATE OTP
// =========================
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// =========================
// SEND OTP
// =========================
router.post("/send-otp", otpLimiter, async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.endsWith("@medicaps.ac.in")) {
      return res.status(400).json({ message: "Invalid college email." });
    }

    const otp = generateOTP();
    const hashedOtp = await bcrypt.hash(otp, 10);

    await Otp.deleteMany({ email });

    await Otp.create({
      email,
      otp: hashedOtp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    // Brevo API call directly
    await axios({
  method: "post",
  url: "https://api.brevo.com/v3/smtp/email",
  headers: {
    "accept": "application/json",
    "content-type": "application/json",
    "api-key": process.env.BREVO_API_KEY,
  },
  data: {
    sender: {
      email: process.env.EMAIL_FROM,
      name: "UniLift",
    },
    to: [{ email }],
    subject: "UniLift OTP Verification",
    htmlContent: `
      <div style="font-family:sans-serif;">
        <h2>UniLift Verification Code</h2>
        <p>Your OTP is:</p>
        <h1 style="letter-spacing:4px;">${otp}</h1>
        <p>This OTP expires in 5 minutes.</p>
      </div>
    `,
  },
});
// =========================
// VERIFY OTP
// =========================
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const record = await Otp.findOne({ email });

    if (!record) {
      return res.status(400).json({ message: "OTP not found." });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ email });
      return res.status(400).json({ message: "OTP expired." });
    }

    const isMatch = await bcrypt.compare(otp, record.otp);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid OTP." });
    }

    await Otp.deleteOne({ email });

    res.status(200).json({ message: "OTP verified successfully." });

  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ message: "Verification failed." });
  }
});

// =========================
// REGISTER
// =========================
router.post("/register", async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      drivingLicense,
      vehicleNumber,
      vehicleType,
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      role,
      drivingLicense: role === "driver" ? drivingLicense : undefined,
      vehicleNumber: role === "driver" ? vehicleNumber : undefined,
      vehicleType: role === "driver" ? vehicleType : undefined,
      isApproved: role === "driver" ? false : true,
    });

    await newUser.save();

    res.status(201).json({ message: "User registered successfully." });

  } catch (error) {
    console.error("Register Error:", error);
    res.status(500).json({ message: "Registration failed." });
  }
});

// =========================
// LOGIN
// =========================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    if (user.role === "driver" && !user.isApproved) {
      return res.status(403).json({
        message: "Driver account pending approval.",
      });
    }

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });

  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

module.exports = router;