import { model, models, Schema } from "mongoose";

const caseRecordSchema = new Schema(
  {
    // Catalog-driven (kind "project") Setting._id — same catalog the
    // employee roster's project/site field uses.
    projectId: { type: String, required: true },
    caseName: { type: String, required: true, trim: true },
    caseNumber: { type: String, required: true, trim: true },
    // Catalog-driven (kind "status", category "case-classification") —
    // admin-editable in Settings without a schema change.
    classificationId: { type: String, required: true },
    // Catalog-driven (kind "status", category "case-status").
    statusId: { type: String, required: true, index: true },
    legalCounsel: { type: String, trim: true },
    briefHistory: { type: String, trim: true },
  },
  { timestamps: true },
);

export const CaseRecordModel = models.CaseRecord ?? model("CaseRecord", caseRecordSchema);
