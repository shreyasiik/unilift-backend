const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const bcrypt = require("bcrypt");
const User = require("../models/User");

passport.use(
  new LocalStrategy(
    {
      usernameField: "email",
      passwordField: "password",
    },
    async (email, password, done) => {
      try {
        if (!email || !password) {
          return done(null, false, { message: "All fields required" });
        }

        const cleanEmail = email.trim().toLowerCase();

        const user = await User.findOne({ email: cleanEmail });

        if (!user) {
          return done(null, false, { message: "User not found" });
        }

        if (!user.password) {
          return done(null, false, { message: "Please register first" });
        }

        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
          return done(null, false, { message: "Invalid password" });
        }

        if (!user.isVerified) {
          return done(null, false, { message: "Email not verified" });
        }

        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

module.exports = passport;   // ← THIS LINE IS CRITICAL