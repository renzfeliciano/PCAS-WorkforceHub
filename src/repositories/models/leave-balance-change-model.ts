import { model, models, Schema } from "mongoose";

const leaveBalanceChangeSchema = new Schema(
  {
    employeeId: { type: Schema.Types.ObjectId, required: true, ref: "Employee", index: true },
    leaveTypeId: { type: String, required: true },
    previousBalance: { type: Number, required: true },
    newBalance: { type: Number, required: true },
    actorId: { type: String },
    actorName: { type: String },
    actorRole: { type: String, required: true },
  },
  { timestamps: true },
);

export const LeaveBalanceChangeModel =
  models.LeaveBalanceChange ?? model("LeaveBalanceChange", leaveBalanceChangeSchema);
