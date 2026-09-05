import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { LeaveRecordModel } from "@/repositories/models/leave-record-model";
import type { LeaveRecord } from "@/types/leave-record";

type LeaveRecordDocument = {
  _id: { toString(): string };
  employeeId: { toString(): string };
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type LeaveRecordFields = {
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string;
};

function toLeaveRecord(doc: LeaveRecordDocument): LeaveRecord {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    leaveTypeId: doc.leaveTypeId,
    startDate: doc.startDate,
    endDate: doc.endDate,
    days: doc.days,
    reason: doc.reason,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

export interface LeaveRecordRepository {
  findByEmployee(employeeId: string): Promise<LeaveRecord[]>;
  findById(id: string): Promise<LeaveRecord | null>;
  create(employeeId: string, input: LeaveRecordFields): Promise<LeaveRecord>;
  update(id: string, patch: LeaveRecordFields): Promise<LeaveRecord>;
  delete(id: string): Promise<LeaveRecord>;
}

export class MongoLeaveRecordRepository implements LeaveRecordRepository {
  async findByEmployee(employeeId: string): Promise<LeaveRecord[]> {
    if (!isValidObjectId(employeeId)) return [];
    const docs = await LeaveRecordModel.find({ employeeId })
      .sort({ startDate: -1 })
      .lean<LeaveRecordDocument[]>();
    return docs.map(toLeaveRecord);
  }

  async findById(id: string): Promise<LeaveRecord | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await LeaveRecordModel.findById(id).lean<LeaveRecordDocument | null>();
    return doc ? toLeaveRecord(doc) : null;
  }

  async create(employeeId: string, input: LeaveRecordFields): Promise<LeaveRecord> {
    const doc = await LeaveRecordModel.create({ employeeId, ...input });
    return toLeaveRecord(doc.toObject() as LeaveRecordDocument);
  }

  async update(id: string, patch: LeaveRecordFields): Promise<LeaveRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Leave record not found");
    const doc = await LeaveRecordModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<LeaveRecordDocument | null>();
    if (!doc) throw new NotFoundError("Leave record not found");
    return toLeaveRecord(doc);
  }

  async delete(id: string): Promise<LeaveRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Leave record not found");
    const doc = await LeaveRecordModel.findByIdAndDelete(id).lean<LeaveRecordDocument | null>();
    if (!doc) throw new NotFoundError("Leave record not found");
    return toLeaveRecord(doc);
  }
}
