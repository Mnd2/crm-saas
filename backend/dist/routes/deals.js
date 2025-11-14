"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../config/audit");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/v1/deals
 */
router.get("/", async (req, res) => {
    const { organizationId } = req.user;
    const deals = await prisma_1.prisma.deal.findMany({
        where: { organizationId },
        include: {
            contact: true,
        },
        orderBy: { createdAt: "desc" },
    });
    res.json(deals);
});
/**
 * POST /api/v1/deals
 */
router.post("/", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { title, amount, stage, currency, contactId, expectedClose, source } = req.body;
    if (!title) {
        return res.status(400).json({ message: "Pavadinimas privalomas" });
    }
    const deal = await prisma_1.prisma.deal.create({
        data: {
            title,
            amount: amount ?? null,
            stage: stage || "new",
            currency: currency || "EUR",
            contactId: contactId || null,
            expectedClose: expectedClose ? new Date(expectedClose) : null,
            source: source || null,
            organizationId,
            ownerId: userId,
        },
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "deal.create",
        entityType: "Deal",
        entityId: deal.id,
    });
    res.status(201).json(deal);
});
/**
 * PATCH /api/v1/deals/:id/stage
 */
router.patch("/:id/stage", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const { stage } = req.body;
    const existing = await prisma_1.prisma.deal.findFirst({
        where: { id, organizationId },
    });
    if (!existing) {
        return res.status(404).json({ message: "Sandoris nerastas" });
    }
    const deal = await prisma_1.prisma.deal.update({
        where: { id },
        data: { stage: stage ?? existing.stage },
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "deal.updateStage",
        entityType: "Deal",
        entityId: id,
        meta: { from: existing.stage, to: stage },
    });
    res.json(deal);
});
exports.default = router;
