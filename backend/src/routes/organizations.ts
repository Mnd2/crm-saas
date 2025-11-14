import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/organizations/me
 */
router.get("/me", async (req, res) => {
  const { organizationId } = req.user!;

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    return res.status(404).json({ message: "Organizacija nerasta" });
  }

  res.json(org);
});

/**
 * PUT /api/v1/organizations/me
 * Bendri laukai (pavadinimas ir pan.)
 */
router.put("/me", requireAdmin, async (req, res) => {
  const { organizationId } = req.user!;
  const { name, timezone, plan, domain } = req.body;

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      name,
      timezone,
      plan,
      domain,
    },
  });

  res.json(org);
});

/**
 * PUT /api/v1/organizations/me/settings
 * PrestaShop + el. paštas
 */
router.put("/me/settings", requireAdmin, async (req, res) => {
  const { organizationId } = req.user!;

  const {
    prestashopBaseUrl,
    prestashopApiKey,
    emailFrom,
    emailSmtpHost,
    emailSmtpPort,
    emailSmtpUser,
    emailSmtpPassword,
  } = req.body;

  const org = await prisma.organization.update({
    where: { id: organizationId },
    data: {
      prestashopBaseUrl,
      prestashopApiKey,
      emailFrom,
      emailSmtpHost,
      emailSmtpPort,
      emailSmtpUser,
      emailSmtpPassword,
    },
  });

  res.json(org);
});

export default router;
