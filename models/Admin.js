const mongoose = require("mongoose");

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  usertype: { type: String, default: "Admin" },
  createAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("AdminUser", adminSchema);
