const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ["driver", "rider"],
    required: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },

  // Driver-only fields
  licenseNumber: {
    type: String
  },
  vehicleNumber: {
    type: String
  },
  vehicleType: {
    type: String
  }

}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);