import { AuditLogModel } from "@/repositories/models/audit-log-model";

export type AuditLogEntry = {
  action: string;
  entityId: string;
  actorId?: string;
  actorRole: string;
  requestId?: string;
};

export interface AuditLogRepository {
  record(entry: AuditLogEntry): Promise<void>;
}

export class MongoAuditLogRepository implements AuditLogRepository {
  async record(entry: AuditLogEntry): Promise<void> {
    await AuditLogModel.create(entry);
  }
}
