import { model, models, Schema } from "mongoose";

const settingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["position", "project", "status"],
      required: true,
    },
    category: { type: String, trim: true },
    description: { type: String, trim: true },
    sortOrder: { type: Number },
    active: { type: Boolean, default: true, index: true },
    // Position entries only: grants the attendance self-service exception
    // (create/edit/delete their own record) to any employee holding this
    // position — tied to the entry's id, not its current name, so renaming
    // the position in Catalog Management never silently breaks the grant.
    // Any number of positions can carry this flag, not just one.
    grantsAttendanceSelfService: { type: Boolean, default: false },
  },
  { timestamps: true },
);
settingSchema.index({ kind: 1, category: 1, name: 1 }, { unique: true });
export const SettingModel = models.Setting ?? model("Setting", settingSchema);
