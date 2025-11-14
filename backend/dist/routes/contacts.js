"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const audit_1 = require("../config/audit");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/v1/contacts
 * Query: search?, stage?
 */
router.get("/", async (req, res) => {
    const { organizationId } = req.user;
    const search = req.query.search || "";
    const stage = req.query.stage || "all";
    const contacts = await prisma_1.prisma.contact.findMany({
        where: {
            organizationId,
            ...(stage !== "all" ? { lifecycleStage: stage } : {}),
            OR: search
                ? [
                    { firstName: { contains: search, mode: "insensitive" } },
                    { lastName: { contains: search, mode: "insensitive" } },
                    { email: { contains: search, mode: "insensitive" } },
                    { company: { contains: search, mode: "insensitive" } }
                ]
                : undefined
        },
        orderBy: { createdAt: "desc" }
    });
    res.json(contacts);
});
/**
 * GET /api/v1/contacts/stats
 */
router.get("/stats", async (req, res) => {
    const { organizationId } = req.user;
    const grouped = await prisma_1.prisma.contact.groupBy({
        by: ["lifecycleStage"],
        where: { organizationId },
        _count: { _all: true }
    });
    const total = grouped.reduce((sum, row) => sum + row._count._all, 0);
    res.json({
        total,
        stages: grouped.map((row) => ({
            stage: row.lifecycleStage || "lead",
            count: row._count._all
        }))
    });
});
/**
 * GET /api/v1/contacts/:id
 */
router.get("/:id", async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const contact = await prisma_1.prisma.contact.findFirst({
        where: { id, organizationId },
        include: {
            deals: true,
            activities: {
                orderBy: { createdAt: "desc" }
            }
        }
    });
    if (!contact) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    res.json(contact);
});
/**
 * POST /api/v1/contacts
 */
router.post("/", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { firstName, lastName, email, phone, company, lifecycleStage, tags } = req.body;
    if (!firstName && !lastName && !email) {
        return res
            .status(400)
            .json({ message: "Bent vardas arba el. paštas privalomi" });
    }
    const contact = await prisma_1.prisma.contact.create({
        data: {
            firstName,
            lastName,
            email,
            phone,
            company,
            lifecycleStage: lifecycleStage || "lead",
            tags: tags ?? [],
            organizationId,
            ownerId: userId
        }
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "contact.create",
        entityType: "Contact",
        entityId: contact.id,
        meta: { firstName, lastName }
    });
    res.status(201).json(contact);
});
/**
 * PUT /api/v1/contacts/:id
 */
router.put("/:id", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const existing = await prisma_1.prisma.contact.findFirst({
        where: { id, organizationId }
    });
    if (!existing) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    const { firstName, lastName, email, phone, company, lifecycleStage, tags } = req.body;
    const contact = await prisma_1.prisma.contact.update({
        where: { id },
        data: {
            firstName,
            lastName,
            email,
            phone,
            company,
            lifecycleStage,
            tags: tags ?? existing.tags
        }
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "contact.update",
        entityType: "Contact",
        entityId: contact.id
    });
    res.json(contact);
});
/**
 * PATCH /api/v1/contacts/:id/stage
 */
router.patch("/:id/stage", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const { stage } = req.body;
    if (!stage) {
        return res.status(400).json({ message: "Stage privalomas" });
    }
    const contact = await prisma_1.prisma.contact.findFirst({
        where: { id, organizationId }
    });
    if (!contact) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    const updated = await prisma_1.prisma.contact.update({
        where: { id },
        data: { lifecycleStage: stage }
    });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "contact.stage.update",
        entityType: "Contact",
        entityId: contact.id,
        meta: { before: contact.lifecycleStage, after: stage }
    });
    res.json(updated);
});
/**
 * DELETE /api/v1/contacts/:id
 */
router.delete("/:id", async (req, res) => {
    const { organizationId, userId } = req.user;
    const { id } = req.params;
    const existing = await prisma_1.prisma.contact.findFirst({
        where: { id, organizationId }
    });
    if (!existing) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    await prisma_1.prisma.contact.delete({ where: { id } });
    await (0, audit_1.logAudit)({
        organizationId,
        userId,
        action: "contact.delete",
        entityType: "Contact",
        entityId: id
    });
    res.status(204).send();
});
exports.default = router;
