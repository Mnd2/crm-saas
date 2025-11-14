import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware, requireAdmin } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

/**
 * GET /api/v1/users
 */
router.get("/", async (req, res) => {
  const { organizationId } = req.user!;
  const users = await prisma.user.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
  });
  res.json(users);
});

/**
 * POST /api/v1/users
 * Admin: pakviesti naują komandos narį (paprastas user)
 */
router.post("/", requireAdmin, async (req, res) => {
  const { organizationId } = req.user!;
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "Trūksta laukų" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(400).json({ message: "Toks el. paštas jau naudojamas" });
  }

  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role: "user",
      organizationId,
    },
  });

  res.status(201).json(user);
});

/**
 * PATCH /api/v1/users/:id/role
 */
router.patch("/:id/role", requireAdmin, async (req, res) => {
  const { organizationId } = req.user!;
  const { id } = req.params;
  const { role } = req.body as { role?: "admin" | "user" };

  if (!role) {
    return res.status(400).json({ message: "Role privalomas" });
  }

  const user = await prisma.user.updateMany({
    where: { id, organizationId },
    data: { role },
  });

  if (user.count === 0) {
    return res.status(404).json({ message: "Vartotojas nerastas" });
  }

  res.json({ success: true });
});

/**
 * PATCH /api/v1/users/:id/status
 */
router.patch("/:id/status", requireAdmin, async (req, res) => {
  const { organizationId } = req.user!;
  const { id } = req.params;
  const { isActive } = req.body as { isActive?: boolean };

  if (isActive === undefined) {
    return res.status(400).json({ message: "isActive privalomas" });
  }

  const user = await prisma.user.updateMany({
    where: { id, organizationId },
    data: { isActive },
  });

  if (user.count === 0) {
    return res.status(404).json({ message: "Vartotojas nerastas" });
  }

  res.json({ success: true });
});

export default router;
