import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { AssetIssuanceModel } from "@/repositories/models/asset-issuance-model";
import type { AssetCondition } from "@/schemas/asset-issuance";
import type { AssetIssuance } from "@/types/asset-issuance";

export type AssetIssuanceFields = {
  assetName: string;
  assetType?: string;
  serialNumber?: string;
  condition: AssetCondition;
  issuedDate: string;
  returnedDate?: string;
  remarks?: string;
};

export interface AssetIssuanceRepository {
  findByEmployee(employeeId: string): Promise<AssetIssuance[]>;
  findById(id: string): Promise<AssetIssuance | null>;
  create(employeeId: string, input: AssetIssuanceFields): Promise<AssetIssuance>;
  update(id: string, patch: AssetIssuanceFields): Promise<AssetIssuance>;
  delete(id: string): Promise<void>;
}

type AssetIssuanceDocument = {
  _id: { toString(): string };
  employeeId: { toString(): string };
  assetName: string;
  assetType?: string;
  serialNumber?: string;
  condition: AssetCondition;
  issuedDate: string;
  returnedDate?: string;
  remarks?: string;
  createdAt: Date;
};

function toAssetIssuance(doc: AssetIssuanceDocument): AssetIssuance {
  return {
    id: doc._id.toString(),
    employeeId: doc.employeeId.toString(),
    assetName: doc.assetName,
    assetType: doc.assetType,
    serialNumber: doc.serialNumber,
    condition: doc.condition,
    issuedDate: doc.issuedDate,
    returnedDate: doc.returnedDate,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoAssetIssuanceRepository implements AssetIssuanceRepository {
  async findByEmployee(employeeId: string): Promise<AssetIssuance[]> {
    if (!isValidObjectId(employeeId)) return [];
    const docs = await AssetIssuanceModel.find({ employeeId })
      .sort({ issuedDate: -1, createdAt: -1 })
      .lean<AssetIssuanceDocument[]>();
    return docs.map(toAssetIssuance);
  }

  async findById(id: string): Promise<AssetIssuance | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await AssetIssuanceModel.findById(id).lean<AssetIssuanceDocument | null>();
    return doc ? toAssetIssuance(doc) : null;
  }

  async create(employeeId: string, input: AssetIssuanceFields): Promise<AssetIssuance> {
    const doc = await AssetIssuanceModel.create({ employeeId, ...input });
    return toAssetIssuance(doc.toObject() as AssetIssuanceDocument);
  }

  async update(id: string, patch: AssetIssuanceFields): Promise<AssetIssuance> {
    if (!isValidObjectId(id)) throw new NotFoundError("Asset issuance record not found");
    const doc = await AssetIssuanceModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<AssetIssuanceDocument | null>();
    if (!doc) throw new NotFoundError("Asset issuance record not found");
    return toAssetIssuance(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Asset issuance record not found");
    const result = await AssetIssuanceModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Asset issuance record not found");
  }
}
