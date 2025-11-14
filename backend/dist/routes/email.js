"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const nodemailer_1 = __importDefault(require("nodemailer"));
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
function buildTransport(org) {
    const host = org.emailSmtpHost || env_1.env.EMAIL_SMTP_HOST;
    const port = org.emailSmtpPort || env_1.env.EMAIL_SMTP_PORT;
    const user = org.emailSmtpUser || env_1.env.EMAIL_SMTP_USER;
    const pass = org.emailSmtpPassword || env_1.env.EMAIL_SMTP_PASSWORD;
    if (!host || !user || !pass) {
        throw new Error("SMTP nėra pilnai sukonfigūruotas");
    }
    const transport = nodemailer_1.default.createTransport({
        host,
        port,
        secure: port === 465,
        auth: {
            user,
            pass,
        },
    });
    const from = org.emailFrom || env_1.env.EMAIL_FROM || user;
    return { transport, from };
}
/**
 * POST /api/v1/email/test
 * Body: { to }
 */
router.post("/test", async (req, res) => {
    const { organizationId, email: userEmail } = req.user;
    const { to } = req.body;
    const org = await prisma_1.prisma.organization.findUnique({
        where: { id: organizationId },
    });
    if (!org) {
        return res.status(404).json({ message: "Organizacija nerasta" });
    }
    if (!to) {
        return res.status(400).json({ message: "Trūksta gavėjo el. pašto" });
    }
    try {
        const { transport, from } = buildTransport(org);
        await transport.sendMail({
            from,
            to,
            subject: "Testinis CRM laiškas",
            text: `Sveiki, tai testinis laiškas iš CRM. Siuntė: ${userEmail}.`,
        });
        res.json({ success: true });
    }
    catch (e) {
        console.error("Test email error", e.message);
        res.status(500).json({
            success: false,
            message: "Nepavyko išsiųsti laiško",
            error: e.message,
        });
    }
});
exports.default = router;
