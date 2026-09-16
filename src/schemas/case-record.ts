import { z } from "zod";
import { paginationQuerySchema, sortQuerySchema } from "@/schemas/list-query";

const caseRecordSortFields = [
  "project",
  "caseName",
  "caseNumber",
  "classification",
  "status",
  "legalCounsel",
] as const;

export const caseRecordSchema = z.object({
  projectId: z.string().trim().min(1, "Select a project"),
  caseName: z.string().trim().min(1, "Case name is required").max(160),
  caseNumber: z.string().trim().min(1, "Case number is required").max(80),
  classificationId: z.string().trim().min(1, "Select a classification"),
  statusId: z.string().trim().min(1, "Select a status"),
  legalCounsel: z.string().trim().max(120).optional(),
  briefHistory: z.string().trim().max(2000).optional(),
});

export const createCaseRecordSchema = caseRecordSchema;
export const updateCaseRecordSchema = caseRecordSchema;
export type CaseRecordInput = z.infer<typeof caseRecordSchema>;

export const caseRecordListQuerySchema = paginationQuerySchema(10)
  .extend(sortQuerySchema(caseRecordSortFields).shape)
  .extend({
    query: z.string().trim().optional(),
    projectId: z.string().trim().min(1).optional(),
    classificationId: z.string().trim().min(1).optional(),
    statusId: z.string().trim().min(1).optional(),
  });
