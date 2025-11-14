"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * GET /api/v1/users
 */
router.get("/", async (req, res) => {
    const { organizationId } = req.user;
    const users = await prisma_1.prisma.user.findMany({
        where: { organizationId },
        orderBy: { createdAt: "asc" },
    });
    res.json(users);
});
/**
 * POST /api/v1/users
 * Admin: pakviesti naują komandos narį (paprastas user)
 */
router.post("/", auth_1.requireAdmin, async (req, res) => {
    const { organizationId } = req.user;
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
        return res.status(400).json({ message: "Trūksta laukų" });
    }
    const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(400).json({ message: "Toks el. paštas jau naudojamas" });
    }
    const bcrypt = await Promise.resolve().then(() => __importStar(require("bcryptjs")));
    const passwordHash = await bcrypt.default.hash(password, 10);
    const user = await prisma_1.prisma.user.create({
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
router.patch("/:id/role", auth_1.requireAdmin, async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { role } = req.body;
    if (!role) {
        return res.status(400).json({ message: "Role privalomas" });
    }
    const user = await prisma_1.prisma.user.updateMany({
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
router.patch("/:id/status", auth_1.requireAdmin, async (req, res) => {
    const { organizationId } = req.user;
    const { id } = req.params;
    const { isActive } = req.body;
    if (isActive === undefined) {
        return res.status(400).json({ message: "isActive privalomas" });
    }
    const user = await prisma_1.prisma.user.updateMany({
        where: { id, organizationId },
        data: { isActive },
    });
    if (user.count === 0) {
        return res.status(404).json({ message: "Vartotojas nerastas" });
    }
    res.json({ success: true });
});
exports.default = router;
