"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../config/audit");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/v1/activities/upcoming
 */
router.get("/upcoming", async (req, res) => {
    const { organizationId } = req.user;
    const now = new Date();
    const activities = await prisma_1.prisma.activity.findMany({
        where: {
            organizationId,
            OR: [{ scheduledAt: { gte: now } }, { completed: false }],
        },
        orderBy: [{ completed: "asc" }, { scheduledAt: "asc" }],
        take: 50,
    });
    res.json(activities);
});
/**
 * POST /api/v1/activities
 */
router.post("/", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { type, subject, description, scheduledAt, dueDate, contactId, dealId } = req.body;
    if (!type || !subject) {
        return res.status(400).json({ message: "Tipas ir pavadinimas privalomi" });
    }
    const scheduleValue = scheduledAt || dueDate;
    const activity = await prisma_1.prisma.activity.create({
        data: {
            type,
            subject,
            description,
            scheduledAt: scheduleValue ? new Date(scheduleValue) : null,
            contactId: contactId || null,
            dealId: dealId || null,
            organizationId,
            userId
        }
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "activity.create",
        entityType: "Activity",
        entityId: activity.id,
    });
    res.status(201).json(activity);
});
/**
 * PATCH /api/v1/activities/:id/complete
 */
router.patch("/:id/complete", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const existing = await prisma_1.prisma.activity.findFirst({
        where: { id, organizationId },
    });
    if (!existing) {
        return res.status(404).json({ message: "Aktyvumas nerastas" });
    }
    const activity = await prisma_1.prisma.activity.update({
        where: { id },
        data: { completed: true },
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "activity.complete",
        entityType: "Activity",
        entityId: id,
    });
    res.json(activity);
});
exports.default = router;
