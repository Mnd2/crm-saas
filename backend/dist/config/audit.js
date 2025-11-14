"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logAudit = logAudit;
const prisma_1 = require("./prisma");
async function logAudit(params) {
    try {
        await prisma_1.prisma.auditLog.create({
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
    }
    catch (e) {
        console.error("Failed to write audit log", e);
    }
}
