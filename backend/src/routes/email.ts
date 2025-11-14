import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware } from "../middleware/auth";
import nodemailer from "nodemailer";
import { env } from "../config/env";

const router = Router();

router.use(authMiddleware);

function buildTransport(org: {
  emailFrom?: string | null;
  emailSmtpHost?: string | null;
  emailSmtpPort?: number | null;
  emailSmtpUser?: string | null;
  emailSmtpPassword?: string | null;
}) {
  const host = org.emailSmtpHost || env.EMAIL_SMTP_HOST;
  const port = org.emailSmtpPort || env.EMAIL_SMTP_PORT;
  const user = org.emailSmtpUser || env.EMAIL_SMTP_USER;
  const pass = org.emailSmtpPassword || env.EMAIL_SMTP_PASSWORD;

  if (!host || !user || !pass) {
    throw new Error("SMTP nėra pilnai sukonfigūruotas");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  const from = org.emailFrom || env.EMAIL_FROM || user;
  return { transport, from };
}

/**
 * POST /api/v1/email/test
 * Body: { to }
 */
router.post("/test", async (req, res) => {
  const { organizationId, email: userEmail } = req.user!;
  const { to } = req.body as { to?: string };

  const org = await prisma.organization.findUnique({
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
  } catch (e: any) {
    console.error("Test email error", e.message);
    res.status(500).json({
      success: false,
      message: "Nepavyko išsiųsti laiško",
      error: e.message,
    });
  }
});

export default router;
