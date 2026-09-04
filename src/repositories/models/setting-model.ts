import { model, models, Schema } from "mongoose";

const settingSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    kind: {
      type: String,
      enum: ["position", "project", "status"],
      required: true,
    },
    description: { type: String, trim: true },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);
settingSchema.index({ kind: 1, name: 1 }, { unique: true });
export const SettingModel = models.Setting ?? model("Setting", settingSchema);
