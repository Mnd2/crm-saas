import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware } from "../middleware/auth";
import { logAudit } from "../config/audit";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/deals
 */
router.get("/", async (req, res) => {
  const { organizationId } = req.user!;
  const deals = await prisma.deal.findMany({
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
  const { organizationId, userId } = req.user!;
  const { title, amount, stage, currency, contactId, expectedClose, source } =
    req.body;

  if (!title) {
    return res.status(400).json({ message: "Pavadinimas privalomas" });
  }

  const deal = await prisma.deal.create({
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

  await logAudit({
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
  const { organizationId, userId } = req.user!;
  const { id } = req.params;
  const { stage } = req.body as { stage?: string };

  const existing = await prisma.deal.findFirst({
    where: { id, organizationId },
  });

  if (!existing) {
    return res.status(404).json({ message: "Sandoris nerastas" });
  }

  const deal = await prisma.deal.update({
    where: { id },
    data: { stage: stage ?? existing.stage },
  });

  await logAudit({
    organizationId,
    userId,
    action: "deal.updateStage",
    entityType: "Deal",
    entityId: id,
    meta: { from: existing.stage, to: stage },
  });

  res.json(deal);
});

export default router;
