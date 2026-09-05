import { model, models, Schema } from "mongoose";

const leaveBalanceSchema = new Schema(
  {
    leaveTypeId: { type: String, required: true },
    balance: { type: Number, required: true, default: 0, min: 0 },
  },
  { _id: false },
);

const employeeSchema = new Schema(
  {
    employeeNumber: { type: String, required: true, unique: true, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    position: { type: String, required: true, trim: true },
    projectSite: { type: String, required: true, trim: true },
    dateHired: { type: String, required: true },
    endOfContract: { type: String },
    lastDay: { type: String },
    employmentStatus: { type: String, required: true, index: true },
    contactNumber: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    sssNumber: { type: String, required: true, trim: true },
    philHealthNumber: { type: String, required: true, trim: true },
    pagIbigNumber: { type: String, required: true, trim: true },
    tinNumber: { type: String, required: true, trim: true },
    leaveBalances: { type: [leaveBalanceSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const EmployeeModel = models.Employee ?? model("Employee", employeeSchema);
