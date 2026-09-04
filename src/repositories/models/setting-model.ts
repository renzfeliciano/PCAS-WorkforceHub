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
  },
  { timestamps: true },
);
settingSchema.index({ kind: 1, category: 1, name: 1 }, { unique: true });
export const SettingModel = models.Setting ?? model("Setting", settingSchema);
