import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { EmployeeModel } from "@/repositories/models/employee-model";
import { TravelOrderModel } from "@/repositories/models/travel-order-model";
import type { TravelOrder, TravelOrderEmployee } from "@/types/travel-order";

const LIST_LIMIT = 200;

export type TravelOrderPatch = {
  employeeIds: string[];
  startDate: string;
  endDate: string;
  remarks?: string;
};

export interface TravelOrderRepository {
  findAll(): Promise<TravelOrder[]>;
  findById(id: string): Promise<TravelOrder | null>;
  create(input: TravelOrderPatch): Promise<TravelOrder>;
  update(id: string, patch: TravelOrderPatch): Promise<TravelOrder>;
  delete(id: string): Promise<void>;
}

type TravelOrderDocument = {
  _id: { toString(): string };
  employees: { employeeId: { toString(): string } }[];
  startDate: string;
  endDate: string;
  remarks?: string;
  createdAt: Date;
};

type EmployeeNameDocument = { _id: { toString(): string }; employeeNumber?: string; name: string };

/**
 * Travel orders only store `employeeId` — `employeeNumber`/`name` are
 * resolved live from the Employee collection here so a later name change
 * (or employee-number correction) shows up immediately, instead of the
 * order permanently keeping whatever name was current when it was created.
 */
async function resolveEmployeeRefs(ids: readonly string[]): Promise<Map<string, TravelOrderEmployee>> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map();
  const docs = await EmployeeModel.find({ _id: { $in: uniqueIds } })
    .select({ employeeNumber: 1, name: 1 })
    .lean<EmployeeNameDocument[]>();
  return new Map(
    docs.map((doc) => [
      doc._id.toString(),
      { employeeId: doc._id.toString(), employeeNumber: doc.employeeNumber, name: doc.name },
    ]),
  );
}

async function toTravelOrder(doc: TravelOrderDocument): Promise<TravelOrder> {
  const employeeIds = doc.employees.map((entry) => entry.employeeId.toString());
  const refs = await resolveEmployeeRefs(employeeIds);
  return {
    id: doc._id.toString(),
    // Same "—" fallback used elsewhere for a deleted reference (e.g. the
    // roster's Age column with no birth date) — keeps the entry (and the
    // order's history) instead of dropping it when the employee is gone.
    employees: employeeIds.map(
      (employeeId) => refs.get(employeeId) ?? { employeeId, employeeNumber: "—", name: "—" },
    ),
    startDate: doc.startDate,
    endDate: doc.endDate,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function toTravelOrders(docs: TravelOrderDocument[]): Promise<TravelOrder[]> {
  const refs = await resolveEmployeeRefs(docs.flatMap((doc) => doc.employees.map((e) => e.employeeId.toString())));
  return docs.map((doc) => {
    const employeeIds = doc.employees.map((entry) => entry.employeeId.toString());
    return {
      id: doc._id.toString(),
      employees: employeeIds.map(
        (employeeId) => refs.get(employeeId) ?? { employeeId, employeeNumber: "—", name: "—" },
      ),
      startDate: doc.startDate,
      endDate: doc.endDate,
      remarks: doc.remarks,
      createdAt: doc.createdAt.toISOString(),
    };
  });
}

function toPatchDocument(input: TravelOrderPatch) {
  return {
    employees: input.employeeIds.map((employeeId) => ({ employeeId })),
    startDate: input.startDate,
    endDate: input.endDate,
    remarks: input.remarks,
  };
}

export class MongoTravelOrderRepository implements TravelOrderRepository {
  async findAll(): Promise<TravelOrder[]> {
    const docs = await TravelOrderModel.find()
      .sort({ startDate: -1, createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean<TravelOrderDocument[]>();
    return toTravelOrders(docs);
  }

  async findById(id: string): Promise<TravelOrder | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await TravelOrderModel.findById(id).lean<TravelOrderDocument | null>();
    return doc ? toTravelOrder(doc) : null;
  }

  async create(input: TravelOrderPatch): Promise<TravelOrder> {
    const doc = await TravelOrderModel.create(toPatchDocument(input));
    return toTravelOrder(doc.toObject() as TravelOrderDocument);
  }

  async update(id: string, patch: TravelOrderPatch): Promise<TravelOrder> {
    if (!isValidObjectId(id)) throw new NotFoundError("Travel order not found");
    const doc = await TravelOrderModel.findByIdAndUpdate(id, { $set: toPatchDocument(patch) }, { new: true }).lean<TravelOrderDocument | null>();
    if (!doc) throw new NotFoundError("Travel order not found");
    return toTravelOrder(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Travel order not found");
    const result = await TravelOrderModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Travel order not found");
  }
}
