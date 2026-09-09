import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { resolveCatalogNames } from "@/repositories/catalog-lookup";
import { AttendanceRecordModel } from "@/repositories/models/attendance-record-model";
import type { AttendanceRecord } from "@/types/attendance";

type AttendanceRecordDocument = {
  _id: { toString(): string };
  employeeId: { toString(): string };
  date: string;
  statusId: string;
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AttendanceRecordFields = { date: string; statusId: string; remarks?: string };
export type AttendanceRecordPatch = { statusId: string; remarks?: string };

function toAttendanceRecord(doc: AttendanceRecordDocument, statusName: string): AttendanceRecord {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    date: doc.date,
    statusId: doc.statusId,
    status: statusName,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/** Resolves one document's statusId against the catalog and maps it to an AttendanceRecord. */
async function resolveOne(doc: AttendanceRecordDocument): Promise<AttendanceRecord> {
  const names = await resolveCatalogNames([doc.statusId]);
  // Same "—" fallback used for a deleted catalog entry elsewhere (e.g. the
  // roster's Age column with no birth date).
  return toAttendanceRecord(doc, names.get(doc.statusId) ?? "—");
}

/** Resolves many documents' statusId against the catalog in one batched lookup. */
async function resolveMany(docs: AttendanceRecordDocument[]): Promise<AttendanceRecord[]> {
  const names = await resolveCatalogNames(docs.map((doc) => doc.statusId));
  return docs.map((doc) => toAttendanceRecord(doc, names.get(doc.statusId) ?? "—"));
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
    return resolveMany(docs);
  }

  async findById(id: string): Promise<AttendanceRecord | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await AttendanceRecordModel.findById(id).lean<AttendanceRecordDocument | null>();
    return doc ? resolveOne(doc) : null;
  }

  async create(employeeId: string, input: AttendanceRecordFields): Promise<AttendanceRecord> {
    try {
      const doc = await AttendanceRecordModel.create({ employeeId, ...input });
      return resolveOne(doc.toObject() as AttendanceRecordDocument);
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
    return resolveOne(doc);
  }

  async delete(id: string): Promise<AttendanceRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Attendance record not found");
    const doc = await AttendanceRecordModel.findByIdAndDelete(id).lean<AttendanceRecordDocument | null>();
    if (!doc) throw new NotFoundError("Attendance record not found");
    return resolveOne(doc);
  }
}
