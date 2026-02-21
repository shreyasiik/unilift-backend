require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");

require("./config/passport");

const authRoutes = require("./routes/auth");

const app = express();

/* ================= PORT ================= */

const PORT = process.env.PORT || 5000;

/* ================= MIDDLEWARE ================= */

app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "https://unilift-frontend.vercel.app", // 🔥 replace after deploy
    ],
    credentials: true,
  })
);

app.use(
  session({
    secret: process.env.SESSION_SECRET || "fallbacksecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // set true after https deployment
      httpOnly: true,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

/* ================= ROUTES ================= */

app.use("/api/auth", authRoutes);

app.get("/api/protected", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({ message: "Authenticated", user: req.user });
  }
  res.status(401).json({ message: "Unauthorized" });
});

app.get("/", (req, res) => {
  res.send("UniLift Backend Running 🚀");
});

/* ================= DATABASE ================= */

/* ================= DATABASE ================= */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MongoDB ERROR:", err.message));

/* ================= START SERVER ================= */

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});