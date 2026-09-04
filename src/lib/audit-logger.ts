import { MongoAuditLogRepository } from "@/repositories/audit-log-repository";
import type { Role } from "@/types/user";

export interface AuditLogger {
  record(input: {
    action: string;
    entityId: string;
    actorRole: Role;
    actorId?: string;
    requestId?: string;
  }): Promise<void>;
}

const repository = new MongoAuditLogRepository();

export const auditLogger: AuditLogger = {
  async record(input) {
    try {
      await repository.record(input);
    } catch (error) {
      console.error("audit log write failed", error);
    }
  },
};
