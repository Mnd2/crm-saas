import { prisma } from "./prisma";

interface LogParams {
  organizationId: string;
  userId?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  meta?: any;
}

export async function logAudit(params: LogParams) {
  try {
    await prisma.auditLog.create({
      data: {
        organizationId: params.organizationId,
        userId: params.userId,
        action: params.action,
        entityType: params.entityType,
        entityId: params.entityId,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        meta: params.meta,
      },
    });
  } catch (e) {
    console.error("Failed to write audit log", e);
  }
}
