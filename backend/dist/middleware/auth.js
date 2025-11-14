"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAdmin = exports.authMiddleware = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_1 = require("../config/env");
const authMiddleware = (req, res, next) => {
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const token = header.slice("Bearer ".length).trim();
    try {
        const payload = jsonwebtoken_1.default.verify(token, env_1.env.JWT_SECRET);
        req.user = {
            userId: payload.userId,
            organizationId: payload.organizationId,
            role: payload.role,
            email: payload.email,
        };
        next();
    }
    catch (err) {
        console.error("auth error", err);
        return res.status(401).json({ message: "Invalid token" });
    }
};
exports.authMiddleware = authMiddleware;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
        return res.status(403).json({ message: "Admin only" });
    }
    next();
};
exports.requireAdmin = requireAdmin;
