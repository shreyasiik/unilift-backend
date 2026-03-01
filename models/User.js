const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
  },

  email: {
    type: String,
    required: true,
    unique: true,
  },

  password: {
    type: String,
    required: true,
  },

  role: {
    type: String,
    enum: ["driver", "rider"],
    required: true,
  },

  // Driver-only fields
  licenseNumber: {
    type: String,
  },

  vehicleNumber: {
    type: String,
  },

  vehicleType: {
    type: String,
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  isApproved: {
    type: Boolean,
    default: false,
  },

  isAdmin: {
    type: Boolean,
    default: false,
  },

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);