import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";
import type { AttendanceRecord } from "@/types/attendance";

type AttendanceRecordDocument = {
  _id: { toString(): string };
  employeeId: { toString(): string };
  date: string;
  status: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AttendanceRecordFields = { date: string; status: string; remarks?: string };
export type AttendanceRecordPatch = { status: string; remarks?: string };

function toAttendanceRecord(doc: AttendanceRecordDocument): AttendanceRecord {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    date: doc.date,
    status: doc.status,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000,
  );
}

export interface AttendanceRecordRepository {
  findByEmployeeAndRange(employeeId: string, from: string, to: string): Promise<AttendanceRecord[]>;
  findById(id: string): Promise<AttendanceRecord | null>;
  create(employeeId: string, input: AttendanceRecordFields): Promise<AttendanceRecord>;
  update(id: string, patch: AttendanceRecordPatch): Promise<AttendanceRecord>;
  delete(id: string): Promise<AttendanceRecord>;
}

export class MongoAttendanceRecordRepository implements AttendanceRecordRepository {
  async findByEmployeeAndRange(employeeId: string, from: string, to: string): Promise<AttendanceRecord[]> {
    if (!isValidObjectId(employeeId)) return [];
    const docs = await AttendanceRecordModel.find({
      employeeId,
      date: { $gte: from, $lte: to },
    })
      .sort({ date: 1 })
      .lean<AttendanceRecordDocument[]>();
    return docs.map(toAttendanceRecord);
  }

  async findById(id: string): Promise<AttendanceRecord | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await AttendanceRecordModel.findById(id).lean<AttendanceRecordDocument | null>();
    return doc ? toAttendanceRecord(doc) : null;
  }

  async create(employeeId: string, input: AttendanceRecordFields): Promise<AttendanceRecord> {
    try {
      const doc = await AttendanceRecordModel.create({ employeeId, ...input });
      return toAttendanceRecord(doc.toObject() as AttendanceRecordDocument);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("Attendance is already recorded for this date.");
      throw error;
    }
  }

  async update(id: string, patch: AttendanceRecordPatch): Promise<AttendanceRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Attendance record not found");
    const doc = await AttendanceRecordModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<AttendanceRecordDocument | null>();
    if (!doc) throw new NotFoundError("Attendance record not found");
    return toAttendanceRecord(doc);
  }

  async delete(id: string): Promise<AttendanceRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Attendance record not found");
    const doc = await AttendanceRecordModel.findByIdAndDelete(id).lean<AttendanceRecordDocument | null>();
    if (!doc) throw new NotFoundError("Attendance record not found");
    return toAttendanceRecord(doc);
  }
}
