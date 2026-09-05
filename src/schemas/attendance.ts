import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

const todayIso = () => new Date().toISOString().slice(0, 10);

/** date is set once at creation (one record per employee per day) and isn't editable afterward. */
export const createAttendanceRecordSchema = z
  .object({
    date: isoDate,
    status: z.string().trim().min(1),
    remarks: z.string().trim().max(255).optional(),
  })
  .refine((data) => data.date <= todayIso(), {
    message: "Attendance can't be logged for a future date.",
    path: ["date"],
  });

export const updateAttendanceRecordSchema = z.object({
  status: z.string().trim().min(1),
  remarks: z.string().trim().max(255).optional(),
});

export const attendanceMonthSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Use YYYY-MM");

export type AttendanceRecordInput = z.infer<typeof createAttendanceRecordSchema>;
export type AttendanceRecordUpdateInput = z.infer<typeof updateAttendanceRecordSchema>;
