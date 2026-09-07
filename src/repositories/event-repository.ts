import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { EventModel } from "@/repositories/models/event-model";
import type { EventCategory } from "@/schemas/event";
import type { WorkforceEvent } from "@/types/event";

export type EventPatch = {
  title: string;
  date: string;
  time?: string;
  category: EventCategory;
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
  category: EventCategory;
  description?: string;
  createdAt: Date;
};

function toEvent(doc: EventDocument): WorkforceEvent {
  return {
    id: doc._id.toString(),
    title: doc.title,
    date: doc.date,
    time: doc.time,
    category: doc.category,
    description: doc.description,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoEventRepository implements EventRepository {
  async findByRange(from: string, to: string): Promise<WorkforceEvent[]> {
    const docs = await EventModel.find({ date: { $gte: from, $lte: to } })
      .sort({ date: 1, time: 1 })
      .lean<EventDocument[]>();
    return docs.map(toEvent);
  }

  async findById(id: string): Promise<WorkforceEvent | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await EventModel.findById(id).lean<EventDocument | null>();
    return doc ? toEvent(doc) : null;
  }

  async create(input: EventPatch): Promise<WorkforceEvent> {
    const doc = await EventModel.create(input);
    return toEvent(doc.toObject() as EventDocument);
  }

  async update(id: string, patch: EventPatch): Promise<WorkforceEvent> {
    if (!isValidObjectId(id)) throw new NotFoundError("Event not found");
    const doc = await EventModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<EventDocument | null>();
    if (!doc) throw new NotFoundError("Event not found");
    return toEvent(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Event not found");
    const result = await EventModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Event not found");
  }
}
