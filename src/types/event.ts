import type { EventCategory } from "@/schemas/event";

export type WorkforceEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  category: EventCategory;
  description?: string;
  createdAt: string;
};
