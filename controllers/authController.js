// controllers/authController.js
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.register = async (req, res) => {
  const { name, email, password, createAt, usertype } = req.body;
  try {
    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      createAt,
      usertype,
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    const isMath = await bcrypt.compare(password, user.password);
    if (!isMath)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    // res.cookie("token", token, { httpOnly: true });
    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "error server" });
  }
};

exports.logout = async (req, res) => {
  res.json({ message: "Logged out successfully" });
};

exports.dashboard = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.register_User = async (req, res) => {
  try {
    const user = await User.find();
    res.status(200).json({ data: user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

exports.userDelete = async (req, res) => {
  const { id } = req.params;
  try {
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const user = await User.deleteOne({ _id: id });
    if (user.deletedCount === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    if (!user) return res.status(404).json({ message: "user is not found" });
    res.status(201).json({ message: "successfull delete user" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.userEdit = async (req, res) => {
  const { id } = req.params;
  const { name, email, usertype } = req.body;
  try {
    if (!id) return res.status(400).json({ message: "User ID is required" });

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { name, email, usertype }, // Fields to update
      { new: true, runValidators: true } // Options to return the updated document
    );
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User successfully updated", updatedUser });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
