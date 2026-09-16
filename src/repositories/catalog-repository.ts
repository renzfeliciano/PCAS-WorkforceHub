import { isValidObjectId } from "mongoose";
import { ConflictError, NotFoundError } from "@/lib/app-errors";
import { CatalogModel } from "@/repositories/models/catalog-model";
import type {
  CreateCatalogInput,
  UpdateCatalogInput,
} from "@/schemas/catalog";
import type { CatalogItem, CatalogKind } from "@/types/catalog";

export type CatalogListFilters = { kind?: CatalogKind; category?: string };

export interface CatalogRepository {
  findAll(filters?: CatalogListFilters): Promise<CatalogItem[]>;
  findById(id: string): Promise<CatalogItem | null>;
  create(input: CreateCatalogInput): Promise<CatalogItem>;
  update(id: string, patch: UpdateCatalogInput): Promise<CatalogItem>;
  delete(id: string): Promise<void>;
  deleteAll(): Promise<void>;
}

type CatalogDocument = {
  _id: { toString(): string };
  name: string;
  kind: CatalogKind;
  category?: string;
  description?: string;
  sortOrder?: number;
  active: boolean;
  grantsAttendanceSelfService?: boolean;
  countsAsActiveEmployment?: boolean;
};

function toCatalogItem(doc: CatalogDocument): CatalogItem {
  return {
    id: doc._id.toString(),
    name: doc.name,
    kind: doc.kind,
    category: doc.category,
    description: doc.description,
    active: doc.active,
    // Documents saved before this field existed have none on disk — a
    // .lean() read never applies the schema's default.
    grantsAttendanceSelfService: doc.grantsAttendanceSelfService ?? false,
    // Same convention, but defaults to true (not false) — a status entry
    // saved before this flag existed should keep counting as active rather
    // than silently vanishing from headcount.
    countsAsActiveEmployment: doc.countsAsActiveEmployment ?? true,
  };
}

function isDuplicateKeyError(error: unknown): boolean {
  return Boolean(
    error &&
    typeof error === "object" &&
    "code" in error &&
    (error as { code: unknown }).code === 11000,
  );
}

export class MongoCatalogRepository implements CatalogRepository {
  async findAll(filters: CatalogListFilters = {}): Promise<CatalogItem[]> {
    const query: Record<string, unknown> = {};
    if (filters.kind) query.kind = filters.kind;
    if (filters.category) query.category = filters.category;
    const docs = await CatalogModel.find(query)
      .sort({ kind: 1, category: 1, sortOrder: 1, createdAt: 1, name: 1 })
      .lean<CatalogDocument[]>();
    return docs.map(toCatalogItem);
  }

  async findById(id: string): Promise<CatalogItem | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await CatalogModel.findById(id).lean<CatalogDocument | null>();
    return doc ? toCatalogItem(doc) : null;
  }

  async create(input: CreateCatalogInput): Promise<CatalogItem> {
    try {
      const doc = await CatalogModel.create({ ...input, active: true });
      return toCatalogItem(doc.toObject() as CatalogDocument);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError(
          "A setting with this name already exists for this category",
        );
      throw error;
    }
  }

  async update(id: string, patch: UpdateCatalogInput): Promise<CatalogItem> {
    if (!isValidObjectId(id)) throw new NotFoundError("Setting not found");
    try {
      const doc = await CatalogModel.findByIdAndUpdate(
        id,
        { $set: patch },
        { new: true },
      ).lean<CatalogDocument | null>();
      if (!doc) throw new NotFoundError("Setting not found");
      return toCatalogItem(doc);
    } catch (error) {
      if (isDuplicateKeyError(error))
        throw new ConflictError(
          "A setting with this name already exists for this category",
        );
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Setting not found");
    const result = await CatalogModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Setting not found");
  }

  async deleteAll(): Promise<void> {
    await CatalogModel.deleteMany({});
  }
}
