"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/v1/organizations/me
 */
router.get("/me", async (req, res) => {
    const { organizationId } = req.user;
    const org = await prisma_1.prisma.organization.findUnique({
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
router.put("/me", auth_1.requireAdmin, async (req, res) => {
    const { organizationId } = req.user;
    const { name, timezone, plan, domain } = req.body;
    const org = await prisma_1.prisma.organization.update({
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
router.put("/me/settings", auth_1.requireAdmin, async (req, res) => {
    const { organizationId } = req.user;
    const { prestashopBaseUrl, prestashopApiKey, emailFrom, emailSmtpHost, emailSmtpPort, emailSmtpUser, emailSmtpPassword, } = req.body;
    const org = await prisma_1.prisma.organization.update({
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
exports.default = router;
