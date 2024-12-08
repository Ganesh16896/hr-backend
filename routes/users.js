// routes/authRoutes.js
const express = require("express");
const {
  register,
  login,
  logout,
  dashboard,
  register_User,
  userDelete,
  userEdit,
} = require("../controllers/authController");
const protect = require("../middleware/authMiddleware");
const {
  adminregiste,
  adminuserlist,
  adminuser,
  adminlogin,
} = require("../controllers/adminAuthController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.get("/logout", logout);
router.get("/dashboard", protect, dashboard);
router.get("/register/user", register_User);
router.delete("/delete/user/:id", userDelete);
router.put("/user/:id", userEdit);

///-- Admin Auth ---- ///
router.post("/adminregister", adminregiste);
router.post("/adminlogin", adminlogin);
router.get("/adminlist", adminuserlist);
router.get("/adminuser/:id", adminuser);

module.exports = router;
