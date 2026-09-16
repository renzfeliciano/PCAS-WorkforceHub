import { isValidObjectId, type PipelineStage } from "mongoose";
import { NotFoundError } from "@/lib/app-errors";
import { escapeRegex } from "@/lib/regex";
import { lookupCatalogNameStage, resolveCatalogNames } from "@/repositories/catalog-lookup";
import { CaseRecordModel } from "@/repositories/models/case-record-model";
import { CatalogModel } from "@/repositories/models/catalog-model";
import { resolveSort } from "@/repositories/sort";
import { CASE_STATUS_CATEGORY } from "@/types/catalog";
import type { CaseRecord } from "@/types/case-record";
import type { SortDir } from "@/types/list-query";

const ACTIVE_CASE_DASHBOARD_LIMIT = 5;

const CASE_RECORD_SORT_FIELD_MAP = {
  project: "project",
  caseName: "caseName",
  caseNumber: "caseNumber",
  classification: "classification",
  status: "status",
  legalCounsel: "legalCounsel",
} as const;

export type CaseRecordPatch = {
  projectId: string;
  caseName: string;
  caseNumber: string;
  classificationId: string;
  statusId: string;
  legalCounsel?: string;
  briefHistory?: string;
};

export type CaseRecordListFilters = {
  page?: number;
  pageSize?: number;
  projectId?: string;
  classificationId?: string;
  statusId?: string;
  query?: string;
  sortBy?: string;
  sortDir?: SortDir;
};
export type CaseRecordListResult = {
  items: CaseRecord[];
  total: number;
  page: number;
  pageSize: number;
};

export interface CaseRecordRepository {
  findAll(filters: CaseRecordListFilters): Promise<CaseRecordListResult>;
  findById(id: string): Promise<CaseRecord | null>;
  /** The most recent "Ongoing" cases, for the dashboard's Active cases widget. */
  findActiveForDashboard(): Promise<CaseRecord[]>;
  create(input: CaseRecordPatch): Promise<CaseRecord>;
  update(id: string, patch: CaseRecordPatch): Promise<CaseRecord>;
  delete(id: string): Promise<void>;
}

type CaseRecordDocument = {
  _id: { toString(): string };
  projectId: string;
  caseName: string;
  caseNumber: string;
  classificationId: string;
  statusId: string;
  legalCounsel?: string;
  briefHistory?: string;
  createdAt: Date;
};

function toCaseRecord(doc: CaseRecordDocument, names: Map<string, string>): CaseRecord {
  // Same "—" fallback used for a deleted catalog entry elsewhere (e.g. the
  // roster's Age column with no birth date).
  return {
    id: doc._id.toString(),
    projectId: doc.projectId,
    project: names.get(doc.projectId) ?? "—",
    caseName: doc.caseName,
    caseNumber: doc.caseNumber,
    classificationId: doc.classificationId,
    classification: names.get(doc.classificationId) ?? "—",
    statusId: doc.statusId,
    status: names.get(doc.statusId) ?? "—",
    legalCounsel: doc.legalCounsel,
    briefHistory: doc.briefHistory,
    createdAt: doc.createdAt.toISOString(),
  };
}

async function resolveOne(doc: CaseRecordDocument): Promise<CaseRecord> {
  const names = await resolveCatalogNames([doc.projectId, doc.classificationId, doc.statusId]);
  return toCaseRecord(doc, names);
}

async function resolveMany(docs: CaseRecordDocument[]): Promise<CaseRecord[]> {
  const names = await resolveCatalogNames(
    docs.flatMap((doc) => [doc.projectId, doc.classificationId, doc.statusId]),
  );
  return docs.map((doc) => toCaseRecord(doc, names));
}

/** Same shape as `CaseRecordDocument`, plus the catalog names an aggregation pipeline already resolved. */
type ResolvedCaseRecordDocument = CaseRecordDocument & {
  project: string;
  classification: string;
  status: string;
};

function toResolvedCaseRecord(doc: ResolvedCaseRecordDocument): CaseRecord {
  return {
    id: doc._id.toString(),
    projectId: doc.projectId,
    project: doc.project,
    caseName: doc.caseName,
    caseNumber: doc.caseNumber,
    classificationId: doc.classificationId,
    classification: doc.classification,
    statusId: doc.statusId,
    status: doc.status,
    legalCounsel: doc.legalCounsel,
    briefHistory: doc.briefHistory,
    createdAt: doc.createdAt.toISOString(),
  };
}

export class MongoCaseRecordRepository implements CaseRecordRepository {
  async findAll(filters: CaseRecordListFilters): Promise<CaseRecordListResult> {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 20));
    const baseMatch: Record<string, string> = {};
    if (filters.projectId) baseMatch.projectId = filters.projectId;
    if (filters.classificationId) baseMatch.classificationId = filters.classificationId;
    if (filters.statusId) baseMatch.statusId = filters.statusId;

    const sort = resolveSort(
      filters.sortBy,
      filters.sortDir,
      CASE_RECORD_SORT_FIELD_MAP,
      { createdAt: -1 },
    );

    // project/classification/status are stored as catalog ids, so search,
    // sort, and pagination all need the resolved display name — that
    // requires an aggregation ($lookup the catalog) rather than a plain find().
    const pipeline: PipelineStage[] = [
      { $match: baseMatch },
      lookupCatalogNameStage("projectId", "_project") as PipelineStage,
      lookupCatalogNameStage("classificationId", "_classification") as PipelineStage,
      lookupCatalogNameStage("statusId", "_status") as PipelineStage,
      {
        $addFields: {
          // Same "—" fallback as a deleted-catalog-entry resolution
          // elsewhere in this file, for a catalog id that no longer exists.
          project: { $ifNull: [{ $arrayElemAt: ["$_project.name", 0] }, "—"] },
          classification: { $ifNull: [{ $arrayElemAt: ["$_classification.name", 0] }, "—"] },
          status: { $ifNull: [{ $arrayElemAt: ["$_status.name", 0] }, "—"] },
        },
      },
      { $project: { _project: 0, _classification: 0, _status: 0 } },
    ];
    if (filters.query) {
      const pattern = new RegExp(escapeRegex(filters.query.trim()), "i");
      pipeline.push({
        $match: {
          $or: [
            { caseName: pattern },
            { caseNumber: pattern },
            { legalCounsel: pattern },
            { project: pattern },
            { classification: pattern },
            { status: pattern },
          ],
        },
      });
    }
    pipeline.push({
      $facet: {
        data: [{ $sort: sort }, { $skip: (page - 1) * pageSize }, { $limit: pageSize }],
        totalCount: [{ $count: "count" }],
      },
    });

    const [result] = await CaseRecordModel.aggregate<{
      data: ResolvedCaseRecordDocument[];
      totalCount: { count: number }[];
    }>(pipeline);
    const items = (result?.data ?? []).map(toResolvedCaseRecord);
    const total = result?.totalCount[0]?.count ?? 0;
    return { items, total, page, pageSize };
  }

  async findById(id: string): Promise<CaseRecord | null> {
    if (!isValidObjectId(id)) return null;
    const doc = await CaseRecordModel.findById(id).lean<CaseRecordDocument | null>();
    return doc ? resolveOne(doc) : null;
  }

  async findActiveForDashboard(): Promise<CaseRecord[]> {
    // "Active" is hardcoded to the "Ongoing" case-status catalog entry by
    // name, not id — there's no stable id/code to pin this to yet (the same
    // gap STANDARDS.md already documents for employmentStatusId's
    // needsEndOfContract check). Renaming "Ongoing" in Catalog Management
    // would silently stop matching here.
    const ongoingStatus = await CatalogModel.findOne({
      kind: "status",
      category: CASE_STATUS_CATEGORY,
      name: "Ongoing",
    })
      .select({ _id: 1 })
      .lean<{ _id: { toString(): string } } | null>();
    if (!ongoingStatus) return [];

    const docs = await CaseRecordModel.find({ statusId: ongoingStatus._id.toString() })
      .sort({ createdAt: -1 })
      .limit(ACTIVE_CASE_DASHBOARD_LIMIT)
      .lean<CaseRecordDocument[]>();
    return resolveMany(docs);
  }

  async create(input: CaseRecordPatch): Promise<CaseRecord> {
    const doc = await CaseRecordModel.create(input);
    return resolveOne(doc.toObject() as CaseRecordDocument);
  }

  async update(id: string, patch: CaseRecordPatch): Promise<CaseRecord> {
    if (!isValidObjectId(id)) throw new NotFoundError("Case record not found");
    const doc = await CaseRecordModel.findByIdAndUpdate(id, { $set: patch }, { new: true }).lean<CaseRecordDocument | null>();
    if (!doc) throw new NotFoundError("Case record not found");
    return resolveOne(doc);
  }

  async delete(id: string): Promise<void> {
    if (!isValidObjectId(id)) throw new NotFoundError("Case record not found");
    const result = await CaseRecordModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundError("Case record not found");
  }
}
