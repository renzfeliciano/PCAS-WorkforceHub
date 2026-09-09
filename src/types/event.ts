export type WorkforceEvent = {
  id: string;
  title: string;
  date: string;
  time?: string;
  /** Setting._id (kind "status", category "event") this event currently references. */
  categoryId: string;
  /** Current name of the referenced category catalog entry, resolved at read time. */
  category: string;
  description?: string;
  createdAt: string;
};
