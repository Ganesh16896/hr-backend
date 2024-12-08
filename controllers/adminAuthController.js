const Adminuser = require("../models/Admin");
const bycrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

exports.adminregiste = async (req, res) => {
  const { name, email, password, usertype, createAt } = req.body;
  try {
    const adminUserExists = await Adminuser.findOne({ email });
    if (adminUserExists)
      return res.status(400).json({ message: "User already exists" });

    const hashedPassword = await bycrypt.hash(password, 10);
    const adminuser = await Adminuser.create({
      name,
      email,
      password: hashedPassword,
      usertype,
      createAt,
    });
    adminuser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminlogin = async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await Adminuser.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMaths = await bycrypt.compare(password, user.password);
    if (!isMaths)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminuser = async (req, res) => {
  const { id } = req.params;
  try {
    const adminuser = await Adminuser.findById(id).select("-password");
    if (!adminuser) {
      return res.status(404).json({ message: "Admin user not found" });
    }

    res.status(200).json({ data: { adminuser } });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.adminuserlist = async (req, res) => {
  try {
    const alladmin = await Adminuser.find();
    res.status(200).json(alladmin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
