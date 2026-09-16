import { apiRequest } from "@/lib/api-client";
import type { CaseRecordInput } from "@/schemas/case-record";
import type { CaseRecord } from "@/types/case-record";
import type { SortDir } from "@/types/list-query";

export type CaseRecordListParams = {
  page?: number;
  pageSize?: number;
  query?: string;
  projectId?: string;
  classificationId?: string;
  statusId?: string;
  sortBy?: string;
  sortDir?: SortDir;
};
export type CaseRecordListResponse = {
  items: CaseRecord[];
  total: number;
  page: number;
  pageSize: number;
};

function buildQuery(params: CaseRecordListParams) {
  const search = new URLSearchParams();
  if (params.page) search.set("page", String(params.page));
  if (params.pageSize) search.set("pageSize", String(params.pageSize));
  if (params.query) search.set("query", params.query);
  if (params.projectId) search.set("projectId", params.projectId);
  if (params.classificationId) search.set("classificationId", params.classificationId);
  if (params.statusId) search.set("statusId", params.statusId);
  if (params.sortBy) search.set("sortBy", params.sortBy);
  if (params.sortDir) search.set("sortDir", params.sortDir);
  return search.toString();
}

export const caseRecordsClient = {
  list: (params: CaseRecordListParams = {}) =>
    apiRequest<CaseRecordListResponse>(`/api/v1/case-records?${buildQuery(params)}`),
  create: (input: CaseRecordInput) =>
    apiRequest<CaseRecord>("/api/v1/case-records", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  update: (id: string, input: CaseRecordInput) =>
    apiRequest<CaseRecord>(`/api/v1/case-records/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    }),
  delete: (id: string) =>
    apiRequest<{ id: string }>(`/api/v1/case-records/${id}`, { method: "DELETE" }),
};
