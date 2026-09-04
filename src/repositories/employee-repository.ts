import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { EmployeeModel } from "@/repositories/models/employee-model";
import type { EmployeeInput, EmployeeUpdateInput } from "@/schemas/employee";
import type { Employee, Gender, LeaveBalance } from "@/types/employee";

export type EmployeeListFilters = {
  query?: string;
  status?: string;
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
};
export type EmployeeListResult = {
  items: Employee[];
  total: number;
  page: number;
  pageSize: number;
};

export interface EmployeeRepository {
  findAll(filters: EmployeeListFilters): Promise<EmployeeListResult>;
  findActiveForDashboard(): Promise<Employee[]>;
  findById(id: string): Promise<Employee | null>;
  create(input: EmployeeInput): Promise<Employee>;
  update(id: string, patch: EmployeeUpdateInput): Promise<Employee>;
  archive(id: string): Promise<Employee>;
  updateLeaveBalances(id: string, balances: LeaveBalance[]): Promise<Employee>;
  deleteAll(): Promise<void>;
}

type EmployeeDocument = {
  _id: { toString(): string };
  employeeNumber: string;
  name: string;
  gender: Gender;
  position: string;
  projectSite: string;
  dateHired: string;
  endOfContract: string;
  employmentStatus: string;
  contactNumber: string;
  address: string;
  sssNumber: string;
  philHealthNumber: string;
  pagIbigNumber: string;
  tinNumber: string;
  leaveBalances: LeaveBalance[];
  archived: boolean;
  createdAt: Date;
};

function toEmployee(doc: EmployeeDocument): Employee {
  return {
    id: doc._id.toString(),
    employeeNumber: doc.employeeNumber,
    name: doc.name,
    gender: doc.gender,
    position: doc.position,
    projectSite: doc.projectSite,
    dateHired: doc.dateHired,
    endOfContract: doc.endOfContract,
    employmentStatus: doc.employmentStatus,
    contactNumber: doc.contactNumber,
    address: doc.address,
    sssNumber: doc.sssNumber,
    philHealthNumber: doc.philHealthNumber,
    pagIbigNumber: doc.pagIbigNumber,
    tinNumber: doc.tinNumber,
    leaveBalances: doc.leaveBalances,
    archived: doc.archived,
    createdAt: doc.createdAt.toISOString(),
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000,
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class MongoEmployeeRepository implements EmployeeRepository {
  async findAll(filters: EmployeeListFilters): Promise<EmployeeListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const mongoQuery: Record<string, unknown> = {
      archived: filters.includeArchived ? { $in: [true, false] } : false,
    };
    if (filters.status) mongoQuery.employmentStatus = filters.status;
    if (filters.query) {
      const pattern = new RegExp(escapeRegex(filters.query.trim()), "i");
      mongoQuery.$or = [
        { name: pattern },
        { employeeNumber: pattern },
        { position: pattern },
        { projectSite: pattern },
      ];
    }
    const [docs, total] = await Promise.all([
      EmployeeModel.find(mongoQuery)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean<EmployeeDocument[]>(),
      EmployeeModel.countDocuments(mongoQuery),
    ]);
    return { items: docs.map(toEmployee), total, page, pageSize };
  }

  async findActiveForDashboard(): Promise<Employee[]> {
    const docs = await EmployeeModel.find({ archived: false })
      .sort({ createdAt: -1 })
      .lean<EmployeeDocument[]>();
    return docs.map(toEmployee);
  }

  async findById(id: string): Promise<Employee | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EmployeeModel.findById(id).lean<EmployeeDocument | null>();
    return doc ? toEmployee(doc) : null;
  }

  async create(input: EmployeeInput): Promise<Employee> {
    const year = Number(input.dateHired.slice(0, 4)) || new Date().getFullYear();
    let lastError: unknown;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const existingForYear = await EmployeeModel.countDocuments({
        employeeNumber: new RegExp(`^WH-${year}-`),
      });
      const sequence = existingForYear + 1 + attempt;
      const employeeNumber = `WH-${year}-${String(sequence).padStart(3, "0")}`;
      try {
        const doc = await EmployeeModel.create({ ...input, employeeNumber, archived: false });
        return toEmployee(doc.toObject() as EmployeeDocument);
      } catch (error) {
        lastError = error;
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("Unable to create employee");
  }

  async update(id: string, patch: EmployeeUpdateInput): Promise<Employee> {
    if (!isValidObjectId(id)) throw new NotFoundError("Employee not found");
    const doc = await EmployeeModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<EmployeeDocument | null>();
    if (!doc) throw new NotFoundError("Employee not found");
    return toEmployee(doc);
  }

  async archive(id: string): Promise<Employee> {
    return this.update(id, { archived: true });
  }

  async updateLeaveBalances(id: string, balances: LeaveBalance[]): Promise<Employee> {
    if (!isValidObjectId(id)) throw new NotFoundError("Employee not found");
    const doc = await EmployeeModel.findByIdAndUpdate(
      id,
      { $set: { leaveBalances: balances } },
      { new: true },
    ).lean<EmployeeDocument | null>();
    if (!doc) throw new NotFoundError("Employee not found");
    return toEmployee(doc);
  }

  async deleteAll(): Promise<void> {
    await EmployeeModel.deleteMany({});
  }
}
