import { model, models, Schema, type InferSchemaType } from "mongoose";
import type { Role } from "@/types/user";

const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    email: {
      type: String,
      unique: false,
      lowercase: true,
      trim: true,
    },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["Admin", "HR", "Manager", "Employee"],
      required: true,
      index: true,
    },
    activeSessionId: { type: String, default: null, select: false },
    lastActivityAt: { type: Date, default: null, select: false },
    active: { type: Boolean, default: true, index: true },
    // The Employee this account was provisioned from (roster-driven accounts
    // only — a manually created account, e.g. the seeded Admin, has none).
    // No default: like employeeNumber above, the field must be genuinely
    // absent (not an explicit null) for every non-roster account, or the
    // sparse index would reject a second such account as a "duplicate" null.
    employeeId: { type: String, sparse: true, unique: true, index: true },
    mustChangePassword: { type: Boolean, default: true },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: { toString(): string };
};
export const UserModel = models.User ?? model("User", userSchema);
export type UserRole = Role;
