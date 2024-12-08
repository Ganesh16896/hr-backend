const express = require("express");
const protect = require("../middleware/authMiddleware");
const {
  clockIn,
  clockOut,
  getAllAttendance,
  getUserAttendance,
  editAttendance,
  UserAttendance,
} = require("../controllers/attendanceController");

const router = express.Router();

router.post("/clockin", protect, clockIn);

router.post("/clockout", protect, clockOut);
router.get("/all", protect, getAllAttendance); // Admin-only route
router.get("/my", protect, getUserAttendance);
router.get("/my/:id", UserAttendance);
router.put("/edit/:id", editAttendance);

module.exports = router;
