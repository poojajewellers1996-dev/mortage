import { db } from '../db/index.js';
import { auditLogs } from '../db/schema.js';

export interface AuditLogParams {
  userId?: string;
  action: string;
  entityName: string;
  entityId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
}

export class AuditService {
  static async log(params: AuditLogParams): Promise<void> {
    try {
      await db.insert(auditLogs).values({
        userId: params.userId || null,
        action: params.action,
        entityName: params.entityName,
        entityId: params.entityId || null,
        details: params.details || null,
        ipAddress: params.ipAddress || null,
      });
    } catch (err) {
      console.error('Failed to write audit log:', err);
    }
  }
}
