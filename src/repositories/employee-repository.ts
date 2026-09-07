import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { resolveSort } from "@/repositories/sort";
import type { EmployeeInput, EmployeeUpdateInput } from "@/schemas/employee";
import type { Employee, Gender, LeaveBalance } from "@/types/employee";
import type { SortDir } from "@/types/list-query";

const EMPLOYEE_SORT_FIELD_MAP = {
  employeeNumber: "employeeNumber",
  name: "name",
  position: "position",
  projectSite: "projectSite",
} as const;

export type EmployeeListFilters = {
  query?: string;
  status?: string[];
  includeArchived?: boolean;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: SortDir;
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
  deletePermanently(id: string): Promise<void>;
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
  birthDate?: string;
  endOfContract?: string;
  lastDay?: string;
  employmentStatus: string;
  contactNumber?: string;
  address?: string;
  sssNumber?: string;
  philHealthNumber?: string;
  pagIbigNumber?: string;
  tinNumber?: string;
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
    birthDate: doc.birthDate,
    endOfContract: doc.endOfContract,
    lastDay: doc.lastDay,
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

/**
 * `endOfContract`/`lastDay` are sent as `null` by the client when they don't
 * apply to the selected employment status. A plain `$set` would leave a
 * stale value in place (Mongo just ignores an absent key), so explicit
 * nulls are routed to `$unset` instead of being written as literal nulls.
 */
function splitPatch(patch: Record<string, unknown>) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) $unset[key] = "";
    else if (value !== undefined) $set[key] = value;
  }
  return { $set, $unset };
}

export class MongoEmployeeRepository implements EmployeeRepository {
  async findAll(filters: EmployeeListFilters): Promise<EmployeeListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const mongoQuery: Record<string, unknown> = {
      archived: filters.includeArchived ? true : false,
    };
    if (filters.status?.length) mongoQuery.employmentStatus = { $in: filters.status };
    if (filters.query) {
      const pattern = new RegExp(escapeRegex(filters.query.trim()), "i");
      mongoQuery.$or = [
        { name: pattern },
        { employeeNumber: pattern },
        { position: pattern },
        { projectSite: pattern },
      ];
    }
    const sort = resolveSort(
      filters.sortBy,
      filters.sortDir,
      EMPLOYEE_SORT_FIELD_MAP,
      { createdAt: -1 },
    );
    const [docs, total] = await Promise.all([
      EmployeeModel.find(mongoQuery)
        .sort(sort)
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
    const { $set } = splitPatch(input);
    try {
      const doc = await EmployeeModel.create({ ...$set, archived: false });
      return toEmployee(doc.toObject() as EmployeeDocument);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("That employee number is already in use.");
      throw error;
    }
  }

  async update(id: string, patch: EmployeeUpdateInput): Promise<Employee> {
    if (!isValidObjectId(id)) throw new NotFoundError("Employee not found");
    const { $set, $unset } = splitPatch(patch);
    const update: Record<string, unknown> = { $set };
    if (Object.keys($unset).length) update.$unset = $unset;
    try {
      const doc = await EmployeeModel.findByIdAndUpdate(id, update, { new: true }).lean<EmployeeDocument | null>();
      if (!doc) throw new NotFoundError("Employee not found");
      return toEmployee(doc);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("That employee number is already in use.");
      throw error;
    }
  }

  async archive(id: string): Promise<Employee> {
    return this.update(id, { archived: true });
  }

  async deletePermanently(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Employee not found");
    const result = await EmployeeModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Employee not found");
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
