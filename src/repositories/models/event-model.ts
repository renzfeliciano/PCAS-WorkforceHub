import { model, models, Schema } from "mongoose";
import { EVENT_CATEGORIES } from "@/schemas/event";

const eventSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    date: { type: String, required: true, index: true },
    time: { type: String },
    category: { type: String, required: true, enum: EVENT_CATEGORIES },
    description: { type: String, trim: true },
  },
  { timestamps: true },
);

export const EventModel = models.Event ?? model("Event", eventSchema);
