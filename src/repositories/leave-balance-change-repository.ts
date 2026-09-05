import { isValidObjectId } from "mongoose";
import { LeaveBalanceChangeModel } from "@/repositories/models/leave-balance-change-model";
import type { LeaveBalanceChange } from "@/types/leave-balance-change";

type LeaveBalanceChangeDocument = {
  _id: { toString(): string };
  employeeId: { toString(): string };
  leaveTypeId: string;
  previousBalance: number;
  newBalance: number;
  actorId?: string;
  actorName?: string;
  actorRole: string;
  createdAt: Date;
};

export type LeaveBalanceChangeFields = {
  employeeId: string;
  leaveTypeId: string;
  previousBalance: number;
  newBalance: number;
  actorId?: string;
  actorName?: string;
  actorRole: string;
};

export type LeaveBalanceChangePage = { items: LeaveBalanceChange[]; total: number };

function toLeaveBalanceChange(doc: LeaveBalanceChangeDocument): LeaveBalanceChange {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    leaveTypeId: doc.leaveTypeId,
    previousBalance: doc.previousBalance,
    newBalance: doc.newBalance,
    actorId: doc.actorId,
    actorName: doc.actorName,
    actorRole: doc.actorRole,
    createdAt: doc.createdAt.toISOString(),
  };
}

export interface LeaveBalanceChangeRepository {
  findByEmployee(employeeId: string, page: number, pageSize: number): Promise<LeaveBalanceChangePage>;
  recordMany(entries: LeaveBalanceChangeFields[]): Promise<void>;
}

export class MongoLeaveBalanceChangeRepository implements LeaveBalanceChangeRepository {
  async findByEmployee(
    employeeId: string,
    page: number,
    pageSize: number,
  ): Promise<LeaveBalanceChangePage> {
    if (!isValidObjectId(employeeId)) return { items: [], total: 0 };
    const query = { employeeId };
    const [docs, total] = await Promise.all([
      LeaveBalanceChangeModel.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<LeaveBalanceChangeDocument[]>(),
      LeaveBalanceChangeModel.countDocuments(query),
    ]);
    return { items: docs.map(toLeaveBalanceChange), total };
  }

  async recordMany(entries: LeaveBalanceChangeFields[]): Promise<void> {
    if (entries.length === 0) return;
    await LeaveBalanceChangeModel.insertMany(entries);
  }
}
