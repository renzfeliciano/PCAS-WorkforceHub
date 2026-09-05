export type LeaveBalanceChange = {
  id: string;
  employeeId: string;
  leaveTypeId: string;
  previousBalance: number;
  newBalance: number;
  actorId?: string;
  actorName?: string;
  actorRole: string;
  createdAt: string;
};
