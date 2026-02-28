require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const cors = require("cors");

require("./config/passport");

const authRoutes = require("./routes/auth");

const app = express();

// IMPORTANT FOR RENDER (PROXY)
app.set("trust proxy", 1);

// =============================
// MIDDLEWARE
// =============================
app.use(express.json());

app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? "https://unilift-frontend.vercel.app"
        : "http://localhost:3000",
    credentials: true,
  })
);

// =============================
// SESSION
// =============================
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// =============================
// ROUTES
// =============================
app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("UniLift Backend Running 🚀");
});

// =============================
// DATABASE
// =============================
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("MongoDB ERROR:", err);
  });