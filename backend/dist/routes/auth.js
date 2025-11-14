"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = require("../config/prisma");
const env_1 = require("../config/env");
const audit_1 = require("../config/audit");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
function createToken(params) {
    return jsonwebtoken_1.default.sign({
        userId: params.userId,
        organizationId: params.organizationId,
        role: params.role,
        email: params.email
    }, env_1.env.JWT_SECRET, { expiresIn: "7d" });
}
/**
 * POST /api/v1/auth/register
 */
router.post("/register", async (req, res) => {
    const { orgName, name, email, password, firstName, lastName } = req.body;
    const organizationName = (orgName || name)?.trim();
    if (!organizationName || !email || !password) {
        return res.status(400).json({ message: "Trūksta laukų" });
    }
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res
            .status(400)
            .json({ message: "Toks el. paštas jau naudojamas" });
    }
    const organization = await prisma_1.prisma.organization.create({
        data: {
            name: organizationName
        }
    });
    const passwordHash = await bcryptjs_1.default.hash(password, 10);
    const displayName = req.body.userName ||
        [firstName, lastName].filter(Boolean).join(" ").trim() ||
        email;
    const user = await prisma_1.prisma.user.create({
        data: {
            name: displayName,
            firstName: firstName?.trim() || null,
            lastName: lastName?.trim() || null,
            email,
            passwordHash,
            role: "admin",
            organizationId: organization.id
        }
    });
    const token = createToken({
        userId: user.id,
        organizationId: organization.id,
        role: user.role,
        email: user.email
    });
    await (0, audit_1.logAudit)({
        organizationId: organization.id,
        userId: user.id,
        action: "user.register",
        entityType: "User",
        entityId: user.id
    });
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});
/**
 * POST /api/v1/auth/login
 */
router.post("/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ message: "Trūksta laukų" });
    }
    const user = await prisma_1.prisma.user.findUnique({
        where: { email },
        include: { organization: true }
    });
    if (!user || !user.isActive) {
        return res.status(401).json({ message: "Neteisingi duomenys" });
    }
    const ok = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!ok) {
        return res.status(401).json({ message: "Neteisingi duomenys" });
    }
    const token = createToken({
        userId: user.id,
        organizationId: user.organizationId,
        role: user.role,
        email: user.email
    });
    await (0, audit_1.logAudit)({
        organizationId: user.organizationId,
        userId: user.id,
        action: "user.login",
        entityType: "User",
        entityId: user.id
    });
    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role
        }
    });
});
/**
 * GET /api/v1/auth/me
 */
router.get("/me", auth_1.authMiddleware, async (req, res) => {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: req.user.userId },
        select: {
            id: true,
            email: true,
            role: true,
            name: true,
            firstName: true,
            lastName: true,
            organization: {
                select: {
                    id: true,
                    name: true,
                    plan: true
                }
            }
        }
    });
    if (!user) {
        return res.status(404).json({ message: "Vartotojas nerastas" });
    }
    res.json(user);
});
exports.default = router;
