export type LeaveRecord = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  createdAt: string;
  updatedAt: string;
};
