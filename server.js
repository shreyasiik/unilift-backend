require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("./config/passport");
const cors = require("cors");

const authRoutes = require("./routes/auth");

const app = express();

/* ================= PORT ================= */

const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

// Parse JSON
app.use(express.json());

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://unilift-frontend.vercel.app",
    ],
    credentials: true,
  })
);

// Session configuration
app.use(
  session({
    name: "unilift.sid",
    secret: process.env.SESSION_SECRET || "devsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // true ONLY in production with HTTPS
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);

// Protected test route
app.get("/api/protected", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  res.json({
    message: "Authenticated",
    user: req.user,
  });
});

// Health check
app.get("/", (req, res) => {
  res.send("UniLift Backend Running 🚀");
});

/* ================= DATABASE ================= */

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => {
    console.error("MongoDB ERROR:", err.message);
    process.exit(1);
  });

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});