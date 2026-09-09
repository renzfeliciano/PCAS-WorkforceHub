import { model, models, Schema } from "mongoose";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    time: { type: String },
    // Catalog-driven (EVENT_CATEGORY_CATEGORY) Setting._id — a rename in
    // Settings is reflected here without touching this document (resolved
    // to a display name at read time).
    categoryId: { type: String, required: true },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

export const EventModel = models.Event ?? model("Event", eventSchema);
