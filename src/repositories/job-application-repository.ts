import { isValidObjectId } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { resolveCatalogNames } from "@/repositories/catalog-lookup";
import { DEFAULT_APPLICATION_STAGE_NAME } from "@/schemas/job-application";
import { JobApplicationModel } from "@/repositories/models/job-application-model";
import { CatalogModel } from "@/repositories/models/catalog-model";
import { RECRUITMENT_STAGE_CATEGORY } from "@/types/catalog";
import type { JobApplication } from "@/types/job-application";

export type JobApplicationPatch = {
  applicantName: string;
  positionId: string;
  email?: string;
  phone?: string;
  appliedDate: string;
  remarks?: string;
};

export interface JobApplicationRepository {
  findAll(): Promise<JobApplication[]>;
  findById(id: string): Promise<JobApplication | null>;
  create(input: JobApplicationPatch): Promise<JobApplication>;
  update(id: string, patch: JobApplicationPatch): Promise<JobApplication>;
  updateStage(id: string, stageId: string): Promise<JobApplication>;
  delete(id: string): Promise<void>;
}

type JobApplicationDocument = {
  _id: { toString(): string };
  applicantName: string;
  positionId: string;
  email?: string;
  phone?: string;
  stageId: string;
  appliedDate: string;
  remarks?: string;
  createdAt: Date;
};

function toJobApplication(doc: JobApplicationDocument, names: Map<string, string>): JobApplication {
  // Same "—" fallback used for a deleted catalog entry elsewhere (e.g. the
  // roster's Age column with no birth date).
  return {
    id: doc._id.toString(),
    applicantName: doc.applicantName,
    positionId: doc.positionId,
    position: names.get(doc.positionId) ?? "—",
    email: doc.email,
    phone: doc.phone,
    stageId: doc.stageId,
    stage: names.get(doc.stageId) ?? "—",
    appliedDate: doc.appliedDate,
    remarks: doc.remarks,
    createdAt: doc.createdAt.toISOString(),
  };
}

/** Resolves one document's positionId/stageId against the catalog and maps it to a JobApplication. */
async function resolveOne(doc: JobApplicationDocument): Promise<JobApplication> {
  const names = await resolveCatalogNames([doc.positionId, doc.stageId]);
  return toJobApplication(doc, names);
}

/** Resolves many documents' positionId/stageId against the catalog in one batched lookup. */
async function resolveMany(docs: JobApplicationDocument[]): Promise<JobApplication[]> {
  const names = await resolveCatalogNames(docs.flatMap((doc) => [doc.positionId, doc.stageId]));
  return docs.map((doc) => toJobApplication(doc, names));
}

/** The default stage a new application lands in, resolved by name from the recruitment stage catalog (not a hardcoded id, since catalog ids aren't stable across environments/seeds). */
async function resolveDefaultStageId(): Promise<string> {
  const setting = await CatalogModel.findOne({
    kind: "status",
    category: RECRUITMENT_STAGE_CATEGORY,
    name: DEFAULT_APPLICATION_STAGE_NAME,
  }).lean<{ _id: { toString(): string } } | null>();
  if (!setting) {
    throw new NotFoundError(
      `No "${DEFAULT_APPLICATION_STAGE_NAME}" recruitment stage is configured in Settings — seed or add it before creating applications.`,
    );
  }
  return setting._id.toString();
}

export class MongoJobApplicationRepository implements JobApplicationRepository {
  /**
   * Deliberately unbounded — the recruitment board is a Kanban view that
   * groups every application by stage, so a page-based cutoff would make
   * older active applications disappear from their column instead of just
   * being on a page nobody's viewing. Recruitment volume is bounded by
   * headcount need in a way employee/attendance history isn't, so this is
   * safe without a limit.
   */
  async findAll(): Promise<JobApplication[]> {
    const docs = await JobApplicationModel.find()
      .sort({ appliedDate: -1, createdAt: -1 })
      .lean<JobApplicationDocument[]>();
    return resolveMany(docs);
  }

  async findById(id: string): Promise<JobApplication | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await JobApplicationModel.findById(id).lean<JobApplicationDocument | null>();
    return doc ? resolveOne(doc) : null;
  }

  async create(input: JobApplicationPatch): Promise<JobApplication> {
    const stageId = await resolveDefaultStageId();
    const doc = await JobApplicationModel.create({ ...input, stageId });
    return resolveOne(doc.toObject() as JobApplicationDocument);
  }

  async update(id: string, patch: JobApplicationPatch): Promise<JobApplication> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const doc = await JobApplicationModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<JobApplicationDocument | null>();
    if (!doc) throw new NotFoundError("Job application not found");
    return resolveOne(doc);
  }

  async updateStage(id: string, stageId: string): Promise<JobApplication> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const doc = await JobApplicationModel.findByIdAndUpdate(id, { $set: { stageId } }, { new: true }).lean<JobApplicationDocument | null>();
    if (!doc) throw new NotFoundError("Job application not found");
    return resolveOne(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Job application not found");
    const result = await JobApplicationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Job application not found");
  }
}
