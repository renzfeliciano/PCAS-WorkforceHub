import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const EVENT_CATEGORIES = ["Meeting", "Holiday", "Deadline", "Reminder", "Other"] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  date: isoDate,
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM")
    .optional(),
  category: z.enum(EVENT_CATEGORIES),
  description: z.string().trim().max(500).optional(),
});

export const createEventSchema = eventSchema;
export const updateEventSchema = eventSchema;
export type EventInput = z.infer<typeof eventSchema>;

export const eventMonthSchema = z.string().regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");
