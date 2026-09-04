import { model, models, Schema } from "mongoose";

const leaveTypeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    code: { type: String, required: true, trim: true, uppercase: true, unique: true },
    eligibility: { type: String, enum: ["Any", "Female", "Male"], default: "Any" },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

export const LeaveTypeModel = models.LeaveType ?? model("LeaveType", leaveTypeSchema);
