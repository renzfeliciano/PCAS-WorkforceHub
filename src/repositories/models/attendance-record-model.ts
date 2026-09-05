import { model, models, Schema } from "mongoose";

const attendanceRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: "Employee", index: true },
    date: { type: String, required: true },
    status: { type: String, required: true },
    remarks: { type: String, trim: true },
  },
  { timestamps: true },
);

/** One attendance record per employee per day. */
attendanceRecordSchema.index({ employeeId: 1, date: 1 }, { unique: true });

export const AttendanceRecordModel =
  models.AttendanceRecord ?? model("AttendanceRecord", attendanceRecordSchema);
