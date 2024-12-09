const Attendance = require("../models/Attendance");
const User = require("../models/User");

// Clock In

exports.clockIn = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date().setHours(0, 0, 0, 0);
    const existingRecord = await Attendance.findOne({
      user: userId,
      clockIn: { $gte: today },
    });

    if (existingRecord) {
      return res.status(400).json({ message: "Already clocked in today" });
    }

    const attendance = new Attendance({ user: userId, clockIn: new Date() });
    await attendance.save();
    res.status(200).json({ message: "Clocked in successfully", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Clock Out
exports.clockOut = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find today's clock-in record
    const attendance = await Attendance.findOne({
      user: userId,
      clockOut: null,
    });

    if (!attendance) {
      return res.status(400).json({ message: "No clock-in record found" });
    }

    attendance.clockOut = new Date();

    // Calculate total working hours
    const clockInTime = new Date(attendance.clockIn).getTime();
    const clockOutTime = new Date(attendance.clockOut).getTime();
    attendance.totalHours = (
      (clockOutTime - clockInTime) /
      (1000 * 60 * 60)
    ).toFixed(2);

    await attendance.save();
    res.status(200).json({ message: "Clocked out successfully", attendance });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get All Attendance Records (Admin)
exports.getAllAttendance = async (req, res) => {
  try {
    const attendanceRecords = await Attendance.find().populate(
      "user",
      "name email"
    );
    res.status(200).json(attendanceRecords);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get User's Attendance History
exports.getUserAttendance = async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch user details
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all attendance records for the user, sorted by creation date (latest first)
    const allAttendanceRecords = await Attendance.find({ user: userId }).sort({
      createdAt: -1,
    });

    if (allAttendanceRecords.length === 0) {
      return res.status(404).json({ message: "Attendance records not found" });
    }

    // Function to convert time to 12-hour IST format
    const formatTimeToIST = (date) => {
      if (!date) return null;
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    };

    // Prepare combined data for each attendance record
    const combinedData = allAttendanceRecords.map((attendance) => {
      let status;
      if (attendance.totalHours >= 8) {
        status = "Full Day";
      } else if (attendance.totalHours >= 4) {
        status = "Half Day";
      } else {
        status = "Absent";
      }

      // Format clock-in and clock-out times to 12-hour IST format
      const formattedClockIn = formatTimeToIST(attendance.clockIn);
      const formattedClockOut = formatTimeToIST(attendance.clockOut);

      return {
        ...attendance.toObject(),
        status, // Adding the status field
        clockIn: formattedClockIn,
        clockOut: formattedClockOut,
        userId: user._id,
        name: user.name,
        email: user.email,
        userCreatedAt: user.createdAt,
        __v: user.__v,
      };
    });

    // Return all attendance records with user details
    res.status(200).json(combinedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.UserAttendance = async (req, res) => {
  // Extract the user ID from the request parameters
  const { id } = req.params;

  try {
    // Fetch user details by ID
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch all attendance records for the specified user, sorted by creation date (latest first)
    const allAttendanceRecords = await Attendance.find({ user: id }).sort({
      createdAt: -1,
    });

    if (allAttendanceRecords.length === 0) {
      return res.status(404).json({ message: "Attendance records not found" });
    }

    // Function to convert time to 12-hour IST format
    const formatTimeToIST = (date) => {
      if (!date) return null;
      return new Date(date).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: true,
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
      });
    };

    // Prepare combined data for each attendance record
    const combinedData = allAttendanceRecords.map((attendance) => {
      let status;
      if (attendance.totalHours >= 8) {
        status = "Full Day";
      } else if (attendance.totalHours >= 4) {
        status = "Half Day";
      } else {
        status = "Absent";
      }

      // Format clock-in and clock-out times to 12-hour IST format
      const formattedClockIn = formatTimeToIST(attendance.clockIn);
      const formattedClockOut = formatTimeToIST(attendance.clockOut);

      return {
        ...attendance.toObject(),
        status, // Adding the status field
        clockIn: formattedClockIn,
        clockOut: formattedClockOut,
        userId: user._id,
        name: user.name,
        email: user.email,
        userCreatedAt: user.createdAt,
        __v: user.__v,
      };
    });

    // Return all attendance records with user details
    res.status(200).json(combinedData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit Attendance
exports.editAttendance = async (req, res) => {
  try {
    const { id } = req.params; // Extract attendance record ID from params
    const { clockIn, clockOut } = req.body; // Extract clockIn and clockOut from the request body
    // Validate that attendance ID is provided
    if (!id) {
      return res.status(400).json({ message: "Attendance ID is required" });
    }
    // Find the attendance record by ID
    const attendance = await Attendance.findById(id);
    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    const updateFields = {};

    if (clockIn) {
      const clockInDate = new Date(clockIn);
      if (isNaN(clockInDate.getTime())) {
        return res
          .status(400)
          .json({ message: `Invalid clockIn time: ${clockIn}` });
      }
      updateFields.clockIn = clockInDate;
    }

    // Validate and update clockOut
    if (clockOut) {
      const clockOutDate = new Date(clockOut);
      if (isNaN(clockOutDate.getTime())) {
        return res
          .status(400)
          .json({ message: `Invalid clockOut time: ${clockOut}` });
      }
      updateFields.clockOut = clockOutDate;
    }

    // Calculate total hours if both clockIn and clockOut are present
    if (updateFields.clockIn || updateFields.clockOut) {
      const clockInTime = updateFields.clockIn
        ? new Date(updateFields.clockIn).getTime()
        : attendance.clockIn.getTime();

      const clockOutTime = updateFields.clockOut
        ? new Date(updateFields.clockOut).getTime()
        : attendance.clockOut?.getTime();

      if (clockInTime && clockOutTime) {
        updateFields.totalHours = (
          (clockOutTime - clockInTime) /
          (1000 * 60 * 60)
        ).toFixed(2);
      }
    }

    // Update the last updated timestamp
    updateFields.updatedAt = new Date();

    // Update attendance record
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(400).json({ message: "Failed to update attendance" });
    }

    res.status(200).json({
      message: "Attendance record updated successfully",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
