import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { resolveCatalogNames } from "@/repositories/catalog-lookup";
import { EventModel } from "@/repositories/models/event-model";
import type { WorkforceEvent } from "@/types/event";

export type EventPatch = {
  title: string;
  date: string;
  time?: string;
  categoryId: string;
  description?: string;
};

export interface EventRepository {
  findByRange(from: string, to: string): Promise<WorkforceEvent[]>;
  findById(id: string): Promise<WorkforceEvent | null>;
  create(input: EventPatch): Promise<WorkforceEvent>;
  update(id: string, patch: EventPatch): Promise<WorkforceEvent>;
  delete(id: string): Promise<void>;
}

type EventDocument = {
  _id: { toString(): string };
  title: string;
  date: string;
  time?: string;
  categoryId: string;
  description?: string;
  createdAt: Date;
};

function toEvent(doc: EventDocument, categoryName: string): WorkforceEvent {
  return {
    id: doc._id.toString(),
    title: doc.title,
    date: doc.date,
    time: doc.time,
    categoryId: doc.categoryId,
    category: categoryName,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Resolves one document's categoryId against the catalog and maps it to a WorkforceEvent. */
async function resolveOne(doc: EventDocument): Promise<WorkforceEvent> {
  const names = await resolveCatalogNames([doc.categoryId]);
  // Same "—" fallback used for a deleted catalog entry elsewhere (e.g. the
  // roster's Age column with no birth date).
  return toEvent(doc, names.get(doc.categoryId) ?? "—");
}

/** Resolves many documents' categoryId against the catalog in one batched lookup. */
async function resolveMany(docs: EventDocument[]): Promise<WorkforceEvent[]> {
  const names = await resolveCatalogNames(docs.map((doc) => doc.categoryId));
  return docs.map((doc) => toEvent(doc, names.get(doc.categoryId) ?? "—"));
}

export class MongoEventRepository implements EventRepository {
  async findByRange(from: string, to: string): Promise<WorkforceEvent[]> {
    const docs = await EventModel.find({ date: { $gte: from, $lte: to } })
      .sort({ date: 1, time: 1 })
      .lean<EventDocument[]>();
    return resolveMany(docs);
  }

  async findById(id: string): Promise<WorkforceEvent | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EventModel.findById(id).lean<EventDocument | null>();
    return doc ? resolveOne(doc) : null;
  }

  async create(input: EventPatch): Promise<WorkforceEvent> {
    const doc = await EventModel.create(input);
    return resolveOne(doc.toObject() as EventDocument);
  }

  async update(id: string, patch: EventPatch): Promise<WorkforceEvent> {
    if (!isValidObjectId(id)) throw new NotFoundError("Event not found");
    const doc = await EventModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<EventDocument | null>();
    if (!doc) throw new NotFoundError("Event not found");
    return resolveOne(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Event not found");
    const result = await EventModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Event not found");
  }
}
