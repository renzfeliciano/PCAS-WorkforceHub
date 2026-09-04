import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { SettingModel } from "@/repositories/models/setting-model";
import type { CreateSettingInput, UpdateSettingInput } from "@/schemas/settings";
import type { SettingItem, SettingKind } from "@/types/settings";

export type SettingListFilters = { kind?: SettingKind; category?: string };

export interface SettingRepository {
  findAll(filters?: SettingListFilters): Promise<SettingItem[]>;
  findById(id: string): Promise<SettingItem | null>;
  create(input: CreateSettingInput): Promise<SettingItem>;
  update(id: string, patch: UpdateSettingInput): Promise<SettingItem>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

type SettingDocument = {
  _id: { toString(): string };
  name: string;
  kind: SettingKind;
  category?: string;
  description?: string;
  active: boolean;
};

function toSettingItem(doc: SettingDocument): SettingItem {
  return {
    id: doc._id.toString(),
    name: doc.name,
    kind: doc.kind,
    category: doc.category,
    description: doc.description,
    active: doc.active,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000,
  );
}

export class MongoSettingRepository implements SettingRepository {
  async findAll(filters: SettingListFilters = {}): Promise<SettingItem[]> {
    const query: Record<string, unknown> = {};
    if (filters.kind) query.kind = filters.kind;
    if (filters.category) query.category = filters.category;
    const docs = await SettingModel.find(query)
      .sort({ kind: 1, category: 1, name: 1 })
      .lean<SettingDocument[]>();
    return docs.map(toSettingItem);
  }

  async findById(id: string): Promise<SettingItem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await SettingModel.findById(id).lean<SettingDocument | null>();
    return doc ? toSettingItem(doc) : null;
  }

  async create(input: CreateSettingInput): Promise<SettingItem> {
    try {
      const doc = await SettingModel.create({ ...input, active: true });
      return toSettingItem(doc.toObject() as SettingDocument);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("A setting with this name already exists for this category");
      throw error;
    }
  }

  async update(id: string, patch: UpdateSettingInput): Promise<SettingItem> {
    if (!isValidObjectId(id)) throw new NotFoundError("Setting not found");
    try {
      const doc = await SettingModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<SettingDocument | null>();
      if (!doc) throw new NotFoundError("Setting not found");
      return toSettingItem(doc);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError("A setting with this name already exists for this category");
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Setting not found");
    const result = await SettingModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Setting not found");
  }

  async deleteAll(): Promise<void> {
    await SettingModel.deleteMany({});
  }
}
