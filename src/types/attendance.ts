export type AttendanceRecord = {
  id: string;
  employeeId: string;
  date: string;
  /** Setting._id (kind "status", category "attendance") this record currently references. */
  statusId: string;
  /** Current name of the referenced status catalog entry, resolved at read time. */
  status: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
};
