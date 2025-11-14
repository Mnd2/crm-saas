import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/analytics/pipeline
 * Naudoja Dashboard pipeline lentelė
 */
router.get("/pipeline", async (req, res) => {
  const { organizationId } = req.user!;

  const deals = await prisma.deal.groupBy({
    by: ["stage"],
    where: { organizationId },
    _count: { _all: true },
    _sum: { amount: true },
  });

  const result = deals.map((d) => ({
    stage: d.stage,
    count: d._count._all,
    totalAmount: d._sum.amount ?? 0,
  }));

  res.json(result);
});

/**
 * GET /api/v1/analytics/activities-summary
 */
router.get("/activities-summary", async (req, res) => {
  const { organizationId } = req.user!;

  const now = new Date();
  const monthAgo = new Date(
    now.getFullYear(),
    now.getMonth() - 1,
    now.getDate()
  );

  const activities = await prisma.activity.groupBy({
    by: ["type"],
    where: {
      organizationId,
      createdAt: { gte: monthAgo },
    },
    _count: { _all: true },
  });

  const result = activities.map((a) => ({
    type: a.type,
    count: a._count._all,
  }));

  res.json(result);
});

export default router;
