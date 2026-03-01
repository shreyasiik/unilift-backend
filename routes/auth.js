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

    await axios({
      method: "post",
      url: "https://api.brevo.com/v3/smtp/email",
      headers: {
        accept: "application/json",
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

    res.status(200).json({ message: "OTP sent successfully." });
  } catch (error) {
    console.error("Send OTP Error:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to send OTP." });
  }
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
      isApproved: true
      isAdmin: false,
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
    console.log("Login debug:", {
     email: user.email,
      role: user.role,
      isApproved: user.isApproved,
      isAdmin: user.isAdmin
});
    if (user.isBanned === true) {
  return res.status(403).json({
    message: "Account banned."
  });
}

    res.status(200).json({
      message: "Login successful.",
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Login failed." });
  }
});

// =========================
// APPROVE DRIVER (ADMIN ONLY)
// =========================
router.patch("/approve-driver/:id", async (req, res) => {
  try {
    const { adminId } = req.body;

    const adminUser = await User.findById(adminId);

    console.log("Admin ID received:", adminId);
    console.log("Admin user found:", adminUser);

    if (!adminUser || !adminUser.isAdmin) {
      return res.status(403).json({ message: "Access denied." });
    }

    const driver = await User.findById(req.params.id);
    if (!driver || driver.role !== "driver") {
      return res.status(400).json({ message: "Driver not found." });
    }

    driver.isApproved = true;
    await driver.save();

    res.status(200).json({ message: "Driver approved successfully." });
  } catch (error) {
    console.error("Approve Driver Error:", error);
    res.status(500).json({ message: "Approval failed." });
  }
});
router.patch("/approve-driver/:id", async (req, res) => {
  try {
    const { adminId } = req.body;

    if (!adminId) {
      return res.status(400).json({ message: "Admin ID required." });
    }

    const adminUser = await User.findById(adminId);

    if (!adminUser || adminUser.isAdmin !== true) {
      return res.status(403).json({ message: "Access denied." });
    }

    const driver = await User.findById(req.params.id);

    if (!driver || driver.role !== "driver") {
      return res.status(404).json({ message: "Driver not found." });
    }

    driver.isApproved = true;
    await driver.save();

    res.status(200).json({
      message: "Driver approved successfully.",
      driverId: driver._id,
    });

  } catch (error) {
    console.error("Approve Driver Error:", error);
    res.status(500).json({ message: "Approval failed." });
  }
});

module.exports = router;