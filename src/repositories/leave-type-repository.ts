import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { LeaveTypeModel } from "@/repositories/models/leave-type-model";
import type { CreateLeaveTypeInput, UpdateLeaveTypeInput } from "@/schemas/leave-type";
import type { LeaveEligibility, LeaveType } from "@/types/leave-type";

export interface LeaveTypeRepository {
  findAll(): Promise<LeaveType[]>;
  create(input: CreateLeaveTypeInput): Promise<LeaveType>;
  update(id: string, patch: UpdateLeaveTypeInput): Promise<LeaveType>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

type LeaveTypeDocument = {
  _id: { toString(): string };
  name: string;
  code: string;
  eligibility: LeaveEligibility;
  description?: string;
  active: boolean;
};

function toLeaveType(doc: LeaveTypeDocument): LeaveType {
  return {
    id: doc._id.toString(),
    name: doc.name,
    code: doc.code,
    eligibility: doc.eligibility,
    description: doc.description,
    active: doc.active,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000,
  );
}

export class MongoLeaveTypeRepository implements LeaveTypeRepository {
  async findAll(): Promise<LeaveType[]> {
    const docs = await LeaveTypeModel.find().sort({ name: 1 }).lean<LeaveTypeDocument[]>();
    return docs.map(toLeaveType);
  }

  async create(input: CreateLeaveTypeInput): Promise<LeaveType> {
    try {
      const doc = await LeaveTypeModel.create({ ...input, active: true });
      return toLeaveType(doc.toObject() as LeaveTypeDocument);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("A leave type with this name or code already exists");
      throw error;
    }
  }

  async update(id: string, patch: UpdateLeaveTypeInput): Promise<LeaveType> {
    if (!isValidObjectId(id)) throw new NotFoundError("Leave type not found");
    try {
      const doc = await LeaveTypeModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<LeaveTypeDocument | null>();
      if (!doc) throw new NotFoundError("Leave type not found");
      return toLeaveType(doc);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("A leave type with this name or code already exists");
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Leave type not found");
    const result = await LeaveTypeModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Leave type not found");
  }

  async deleteAll(): Promise<void> {
    await LeaveTypeModel.deleteMany({});
  }
}
