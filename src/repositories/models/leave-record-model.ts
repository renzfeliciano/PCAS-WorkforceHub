import { model, models, Schema } from "mongoose";

const leaveRecordSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: "Employee", index: true },
    leaveTypeId: { type: String, required: true },
    startDate: { type: String, required: true },
    endDate: { type: String, required: true },
    days: { type: Number, required: true, min: 1 },
    reason: { type: String, trim: true },
  },
  { timestamps: true },
);

export const LeaveRecordModel = models.LeaveRecord ?? model("LeaveRecord", leaveRecordSchema);
