import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { TravelOrderModel } from "@/repositories/models/travel-order-model";
import type { TravelOrder, TravelOrderEmployee } from "@/types/travel-order";

const LIST_LIMIT = 200;

export type TravelOrderPatch = {
  employees: TravelOrderEmployee[];
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
  employees: { employeeId: { toString(): string }; employeeNumber: string; name: string }[];
  startDate: string;
  endDate: string;
  remarks?: string;
  createdAt: Date;
};

function toTravelOrder(doc: TravelOrderDocument): TravelOrder {
  return {
    id: doc._id.toString(),
    employees: doc.employees.map((entry) => ({
      employeeId: entry.employeeId.toString(),
      employeeNumber: entry.employeeNumber,
      name: entry.name,
    })),
    startDate: doc.startDate,
    endDate: doc.endDate,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoTravelOrderRepository implements TravelOrderRepository {
  async findAll(): Promise<TravelOrder[]> {
    const docs = await TravelOrderModel.find()
      .sort({ startDate: -1, createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean<TravelOrderDocument[]>();
    return docs.map(toTravelOrder);
  }

  async findById(id: string): Promise<TravelOrder | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await TravelOrderModel.findById(id).lean<TravelOrderDocument | null>();
    return doc ? toTravelOrder(doc) : null;
  }

  async create(input: TravelOrderPatch): Promise<TravelOrder> {
    const doc = await TravelOrderModel.create(input);
    return toTravelOrder(doc.toObject() as TravelOrderDocument);
  }

  async update(id: string, patch: TravelOrderPatch): Promise<TravelOrder> {
    if (!isValidObjectId(id)) throw new NotFoundError("Travel order not found");
    const doc = await TravelOrderModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<TravelOrderDocument | null>();
    if (!doc) throw new NotFoundError("Travel order not found");
    return toTravelOrder(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Travel order not found");
    const result = await TravelOrderModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Travel order not found");
  }
}
