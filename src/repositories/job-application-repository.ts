import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { DEFAULT_APPLICATION_STAGE } from "@/schemas/job-application";
import { JobApplicationModel } from "@/repositories/models/job-application-model";
import type { JobApplication } from "@/types/job-application";

const LIST_LIMIT = 500;

export type JobApplicationPatch = {
  applicantName: string;
  position: string;
  email?: string;
  phone?: string;
  appliedDate: string;
  notes?: string;
};

export interface JobApplicationRepository {
  findAll(): Promise<JobApplication[]>;
  findById(id: string): Promise<JobApplication | null>;
  create(input: JobApplicationPatch): Promise<JobApplication>;
  update(id: string, patch: JobApplicationPatch): Promise<JobApplication>;
  updateStage(id: string, stage: string): Promise<JobApplication>;
  delete(id: string): Promise<void>;
}

type JobApplicationDocument = {
  _id: { toString(): string };
  applicantName: string;
  position: string;
  email?: string;
  phone?: string;
  stage: string;
  appliedDate: string;
  notes?: string;
  createdAt: Date;
};

function toJobApplication(doc: JobApplicationDocument): JobApplication {
  return {
    id: doc._id.toString(),
    applicantName: doc.applicantName,
    position: doc.position,
    email: doc.email,
    phone: doc.phone,
    stage: doc.stage,
    appliedDate: doc.appliedDate,
    notes: doc.notes,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoJobApplicationRepository implements JobApplicationRepository {
  async findAll(): Promise<JobApplication[]> {
    const docs = await JobApplicationModel.find()
      .sort({ appliedDate: -1, createdAt: -1 })
      .limit(LIST_LIMIT)
      .lean<JobApplicationDocument[]>();
    return docs.map(toJobApplication);
  }

  async findById(id: string): Promise<JobApplication | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await JobApplicationModel.findById(id).lean<JobApplicationDocument | null>();
    return doc ? toJobApplication(doc) : null;
  }

  async create(input: JobApplicationPatch): Promise<JobApplication> {
    const doc = await JobApplicationModel.create({ ...input, stage: DEFAULT_APPLICATION_STAGE });
    return toJobApplication(doc.toObject() as JobApplicationDocument);
  }

  async update(id: string, patch: JobApplicationPatch): Promise<JobApplication> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const doc = await JobApplicationModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<JobApplicationDocument | null>();
    if (!doc) throw new NotFoundError("Job application not found");
    return toJobApplication(doc);
  }

  async updateStage(id: string, stage: string): Promise<JobApplication> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const doc = await JobApplicationModel.findByIdAndUpdate(id, { $set: { stage } }, { new: true }).lean<JobApplicationDocument | null>();
    if (!doc) throw new NotFoundError("Job application not found");
    return toJobApplication(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const result = await JobApplicationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Job application not found");
  }
}
