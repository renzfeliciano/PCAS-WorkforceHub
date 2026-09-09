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
    // sparse: lets multiple employees have no employeeNumber at all without
    // colliding on the unique index — only documents that actually have a
    // value are checked against each other.
    employeeNumber: { type: String, unique: true, sparse: true, trim: true },
    name: { type: String, required: true, trim: true },
    gender: { type: String, enum: ["Male", "Female"], required: true },
    positionId: { type: String, required: true },
    projectSiteId: { type: String, required: true },
    dateHired: { type: String, required: true },
    birthDate: { type: String },
    endOfContract: { type: String },
    lastDay: { type: String },
    employmentStatusId: { type: String, required: true, index: true },
    contactNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    sssNumber: { type: String, trim: true },
    philHealthNumber: { type: String, trim: true },
    pagIbigNumber: { type: String, trim: true },
    tinNumber: { type: String, trim: true },
    leaveBalances: { type: [leaveBalanceSchema], default: [] },
    archived: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

export const EmployeeModel = models.Employee ?? model("Employee", employeeSchema);
