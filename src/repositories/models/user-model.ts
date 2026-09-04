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
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof userSchema> & {
  _id: { toString(): string };
};
export const UserModel = models.User ?? model("User", userSchema);
export type UserRole = Role;
