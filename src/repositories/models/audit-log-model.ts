import { model, models, Schema } from "mongoose";

const auditLogSchema = new Schema(
  {
    action: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    actorId: { type: String },
    actorRole: { type: String, required: true },
    requestId: { type: String },
  },
  { timestamps: true },
);

export const AuditLogModel = models.AuditLog ?? model("AuditLog", auditLogSchema);
