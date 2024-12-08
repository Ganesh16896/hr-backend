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

// Edit Attendance (Clock In / Clock Out)
exports.editAttendance = async (req, res) => {
  try {
    const { clockIn, clockOut } = req.body;
    const { id } = req.params; // Extract the attendance record ID from the URL

    // Validate that attendanceId is provided
    if (!id) {
      return res.status(400).json({ message: "Attendance ID is required" });
    }

    // Find the attendance record by ID
    const attendance = await Attendance.findById(id);

    if (!attendance) {
      return res.status(404).json({ message: "Attendance record not found" });
    }

    // Prepare update object
    const updateFields = {};

    // Helper function to parse time strings like "10:30 AM"
    const parseTime = (timeString, existingDate) => {
      const [time, period] = timeString.split(" ");
      const [hours, minutes] = time.split(":").map(Number);
      const date = new Date(existingDate);

      if (isNaN(hours) || isNaN(minutes) || !["AM", "PM"].includes(period)) {
        throw new Error("Invalid time format");
      }

      date.setHours(period === "PM" && hours < 12 ? hours + 12 : hours % 12);
      date.setMinutes(minutes);
      date.setSeconds(0);
      return date;
    };

    // Edit clockIn if provided
    if (clockIn) {
      try {
        updateFields.clockIn = parseTime(
          clockIn,
          attendance.clockIn || new Date()
        );
      } catch (error) {
        return res
          .status(400)
          .json({ message: `Invalid clockIn time: ${clockIn}` });
      }
    }

    // Edit clockOut if provided
    if (clockOut) {
      try {
        updateFields.clockOut = parseTime(
          clockOut,
          attendance.clockOut || new Date()
        );
      } catch (error) {
        return res
          .status(400)
          .json({ message: `Invalid clockOut time: ${clockOut}` });
      }
    }

    if (clockIn || clockOut) {
      updateFields.updatedAt = new Date(); // Update the last updated timestamp
    }

    // Update the record with the new fields
    const updatedAttendance = await Attendance.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    );

    if (!updatedAttendance) {
      return res.status(400).json({ message: "Failed to update attendance" });
    }

    // Calculate total working hours if both clockIn and clockOut are available
    if (updatedAttendance.clockIn && updatedAttendance.clockOut) {
      const clockInTime = new Date(updatedAttendance.clockIn).getTime();
      const clockOutTime = new Date(updatedAttendance.clockOut).getTime();

      if (clockOutTime >= clockInTime) {
        updatedAttendance.totalHours = (
          (clockOutTime - clockInTime) /
          (1000 * 60 * 60)
        ).toFixed(2);
      } else {
        return res
          .status(400)
          .json({ message: "Clock-out time cannot be before clock-in time" });
      }
    }

    // Save the updated attendance record
    await updatedAttendance.save();

    // Return the updated attendance record
    res.status(200).json({
      message: "Attendance record updated successfully",
      attendance: updatedAttendance,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server Error" });
  }
};
