const express = require("express");
const passport = require("passport");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const Otp = require("../models/Otp");

const router = express.Router();

/* ========================= */
/* VALIDATE COLLEGE EMAIL */
/* ========================= */

function validateCollegeEmail(email) {
  if (!email) return false;
  const cleanEmail = email.trim().toLowerCase();
  return cleanEmail.endsWith("@medicaps.ac.in");
}

/* ========================= */
/* SEND OTP */
/* ========================= */

router.post("/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!validateCollegeEmail(email)) {
      return res.status(400).json({
        message: "Only Medicaps college email allowed",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    await Otp.deleteMany({ email: cleanEmail });
    await Otp.create({ email: cleanEmail, otp, expiresAt });

    const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: cleanEmail,
      subject: "UniLift OTP Verification",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    });

    res.json({ message: "OTP sent successfully" });

  } catch (error) {
  console.log("SEND OTP ERROR:", error);
  res.status(500).json({ message: "Failed to send OTP" });
}
});
/* ========================= */
/* VERIFY OTP */
/* ========================= */

router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    const cleanEmail = email.trim().toLowerCase();

    const record = await Otp.findOne({
      email: cleanEmail,
      otp,
    });

    if (!record) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (record.expiresAt < new Date()) {
      await Otp.deleteMany({ email: cleanEmail });
      return res.status(400).json({ message: "OTP expired" });
    }

    await Otp.deleteMany({ email: cleanEmail });

    // Mark user as verified or create temp user
    let user = await User.findOne({ email: cleanEmail });

    if (!user) {
      user = new User({
        email: cleanEmail,
        isVerified: true,
      });
    } else {
      user.isVerified = true;
    }

    await user.save();

    res.json({ message: "OTP verified successfully" });
  } catch (error) {
    res.status(500).json({ message: "Verification failed" });
  }
});

/* ========================= */
/* REGISTER */
/* ========================= */


/* ================= REGISTER ================= */

router.post("/register", async (req, res) => {
  try {
    console.log("REGISTER BODY:", req.body);

    const {
      email,
      password,
      role,
      license,
      vehicleNumber,
      vehicleType,
    } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({
        message: "Missing required fields",
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.endsWith("@medicaps.ac.in")) {
      return res.status(400).json({
        message: "Only Medicaps college email allowed",
      });
    }

    if (role === "driver") {
      if (
        !license ||
        !vehicleNumber ||
        !vehicleType ||
        !license.trim() ||
        !vehicleNumber.trim()
      ) {
        return res.status(400).json({
          message: "Driver details are required",
        });
      }
    }

    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
  return res.status(409).json({
    message: "User already exists",
    redirectToLogin: true,
  });
}

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      email: cleanEmail,
      password: hashedPassword,
      role,
      license: role === "driver" ? license.trim() : undefined,
      vehicleNumber: role === "driver" ? vehicleNumber.trim() : undefined,
      vehicleType: role === "driver" ? vehicleType : undefined,
    });

    await newUser.save();

    res.json({
      message: "User registered successfully",
    });

  } catch (error) {
    console.log("REGISTER ERROR:", error);
    res.status(500).json({
      message: "Server error during registration",
    });
  }
});

/* ========================= */
/* LOGIN */
/* ========================= */

router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return res.status(500).json({ message: "Server error" });

    if (!user) {
      return res.status(401).json({
        message: info?.message || "Invalid credentials",
      });
    }

    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Login failed" });
      }

      return res.json({
        message: "Logged in successfully",
        user,
      });
    });
  })(req, res, next);
});

/* ========================= */
/* LOGOUT */
/* ========================= */

router.get("/logout", (req, res) => {
  req.logout(() => {
    res.json({ message: "Logged out" });
  });
});

module.exports = router