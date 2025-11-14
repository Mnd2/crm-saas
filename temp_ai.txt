import { Router } from "express";
import axios from "axios";
import { prisma } from "../config/prisma";
import { authMiddleware } from "../middleware/auth";
import { env } from "../config/env";

const router = Router();

router.use(authMiddleware);

interface LeadScoreRequest {
  lifecycleStage?: string;
  lastOrderAmount?: number;
  totalOrders?: number;
  emailOpens?: number;
  pageViews?: number;
  daysSinceLastOrder?: number;
  daysSinceLastActivity?: number;
}

async function callGroq(messages: any[], model?: string) {
  if (!env.GROQ_API_KEY) {
    throw new Error("GROQ_DISABLED");
  }
  const { data } = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: model || env.GROQ_MODEL,
      messages,
    },
    {
      headers: {
        Authorization: `Bearer ${env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 60000,
    }
  );
  return {
    reply: data?.choices?.[0]?.message?.content?.trim() || "",
    usage: data?.usage || null,
  };
}

async function generateWithLLM(messages: any[], primaryModel?: string) {
  if (!env.GROQ_API_KEY) {
    throw new Error("NO_AI_CONFIGURED");
  }
  try {
    return await callGroq(messages, primaryModel);
  } catch (err: any) {
    console.error("AI provider error", err?.response?.data || err?.message);
    err.code = err.code || "ALL_PROVIDERS_FAILED";
    throw err;
  }
}

/**
 * POST /api/v1/ai/chat
 */
router.post("/chat", async (req, res) => {
  const { prompt, system, model } = req.body as {
    prompt?: string;
    system?: string;
    model?: string;
  };

  if (!prompt?.trim()) {
    return res.status(400).json({ message: "Prompt privalomas" });
  }

  const messages = [
    {
      role: "system",
      content:
        system ||
        "Tu esi draugiškas CRM asistentas. Atsakyk glaustai ir lietuviškai.",
    },
    {
      role: "user",
      content: prompt,
    },
  ];

  try {
    const result = await generateWithLLM(messages, model);
    res.json(result);
  } catch (error: any) {
    if (error?.message === "NO_AI_CONFIGURED") {
      return res.status(400).json({
        message: "AI integracija nesukonfigūruota. Nurodyk GROQ_API_KEY.",
      });
    }
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      (typeof error?.message === "string" &&
        error.message.toLowerCase().includes("timeout"));
    const isProviderIssue =
      error?.code === "ALL_PROVIDERS_FAILED" ||
      error?.response?.data?.error?.code === "model_decommissioned";
    if (isTimeout || isProviderIssue) {
      const fallback =
        "Sveiki,\n\nŠiuo metu AI servisai neatsako. Pabandyk dar kartą po kelių sekundžių.\n\n" +
        "Jei reikia greito atsakymo, trumpai sureaguok rankiniu būdu.\n";
      return res.json({ reply: fallback, fallback: true });
    }
    res.status(500).json({
      message: "Nepavyko gauti atsakymo",
      error: error?.response?.data || error?.message,
    });
  }
});

/**
 * POST /api/v1/ai/generate-reply
 * Creates a contact-aware email draft
 */
router.post("/generate-reply", async (req, res) => {
  const { organizationId } = req.user!;
  const { contactId, prompt } = req.body as {
    contactId?: string;
    prompt?: string;
  };

  if (!contactId || !prompt?.trim()) {
    return res.status(400).json({ message: "Trūksta kontakto arba prompt" });
  }

  const contact = await prisma.contact.findFirst({
    where: { id: contactId, organizationId },
  });

  if (!contact) {
    return res.status(404).json({ message: "Kontaktas nerastas" });
  }

  const systemPrompt =
    "Tu esi pardavimų atstovas. Paruošk trumpą, profesionalų lietuvišką laiško atsakymą klientui.";

  try {
    const result = await generateWithLLM([
      { role: "system", content: systemPrompt },
      {
        role: "user",
        content: `Kontaktas: ${contact.firstName || ""} ${
          contact.lastName || ""
        } (${contact.email || "be el. pašto"}).

Kontekstas: ${prompt}`,
      },
    ]);

    res.json(result);
  } catch (error: any) {
    console.error(
      "OpenRouter generate-reply error",
      error?.response?.data || error?.message
    );
    if (error?.message === "NO_AI_CONFIGURED") {
      return res.status(400).json({
        message: "AI integracija nesukonfigūruota. Įrašyk GROQ_API_KEY.",
      });
    }
    const isTimeout =
      error?.code === "ECONNABORTED" ||
      (typeof error?.message === "string" &&
        error.message.toLowerCase().includes("timeout"));
    const isProviderIssue =
      error?.code === "ALL_PROVIDERS_FAILED" ||
      error?.response?.data?.error?.code === "model_decommissioned";
    if (isTimeout || isProviderIssue) {
      const fallback = `Sveiki,

Deja, AI servisas neatsakė laiku, tačiau gali panaudoti šį juodraštį kaip atspirties tašką:

${prompt}

Pagarbiai,
Tavo komanda`;
      return res.json({ reply: fallback, fallback: true });
    }
    res.status(500).json({
      message: "Nepavyko sugeneruoti atsakymo",
      error: error?.response?.data || error?.message,
    });
  }
});

/**
 * POST /api/v1/ai/lead-score
 */
router.post("/lead-score", async (req, res) => {
  const body = req.body as LeadScoreRequest;

  let score = 0;
  const reasons: string[] = [];
  const suggestedActions: string[] = [];

  if (body.lifecycleStage === "customer") {
    score += 20;
    reasons.push("Jau esamas klientas");
  } else if (body.lifecycleStage === "lead") {
    score += 10;
    reasons.push("Potencialus klientas");
  }

  if (body.lastOrderAmount && body.lastOrderAmount > 200) {
    score += 20;
    reasons.push("Didelė paskutinio užsakymo suma");
  }

  if (body.totalOrders && body.totalOrders > 5) {
    score += 15;
    reasons.push("Daug užsakymų istorijoje");
  }

  if (body.emailOpens && body.emailOpens > 3) {
    score += 10;
    reasons.push("Aktyviai atidarinėja el. laiškus");
  }

  if (body.pageViews && body.pageViews > 5) {
    score += 10;
    reasons.push("Dažnai lankosi svetainėje");
  }

  if (body.daysSinceLastOrder && body.daysSinceLastOrder > 90) {
    score -= 10;
    reasons.push("Seniai pirko");
  }

  if (body.daysSinceLastActivity && body.daysSinceLastActivity > 60) {
    score -= 10;
    reasons.push("Seniai buvo kontaktas");
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let priority: "low" | "medium" | "high" = "low";
  if (score >= 70) priority = "high";
  else if (score >= 40) priority = "medium";

  if (priority === "high") {
    suggestedActions.push(
      "Paskambinti šiandien",
      "Pasiūlyti aukštesnį planą"
    );
  } else if (priority === "medium") {
    suggestedActions.push("Išsiųsti personalizuotą el. laišką");
  } else {
    suggestedActions.push("Palikti į nurture seką");
  }

  res.json({
    score,
    reasons,
    priority,
    suggestedActions,
  });
});

/**
 * GET /api/v1/ai/contact/:id/next-action
 */
router.get("/contact/:id/next-action", async (req, res) => {
  const { organizationId } = req.user!;
  const { id } = req.params;

  const contact = await prisma.contact.findFirst({
    where: { id, organizationId },
    include: {
      deals: true,
      activities: {
        orderBy: { createdAt: "desc" },
        take: 5,
      },
    },
  });

  if (!contact) {
    return res.status(404).json({ message: "Kontaktas nerastas" });
  }

  let score = 50;
  const reasons: string[] = [];
  const suggestedActions: string[] = [];

  if (contact.deals.some((d) => d.stage === "won")) {
    score += 20;
    reasons.push("Turi laimėtų sandorių");
  }

  const lastActivity = contact.activities[0];
  if (!lastActivity) {
    score += 10;
    reasons.push("Dar nebuvo jokio veiksmo – verta susisiekti");
    suggestedActions.push("Paskambinti ir prisistatyti");
  } else {
    const days =
      (Date.now() - new Date(lastActivity.createdAt).getTime()) /
      (1000 * 60 * 60 * 24);
    if (days > 30) {
      score += 10;
      reasons.push("Seniai buvo kontaktas");
      suggestedActions.push("Išsiųsti follow-up el. laišką");
    } else {
      reasons.push("Neseniai buvo kontaktas");
    }
  }

  let priority: "low" | "medium" | "high" = "medium";
  if (score >= 75) priority = "high";
  else if (score <= 40) priority = "low";

  if (priority === "high") {
    suggestedActions.push(
      "Skambutis šiandien",
      "Pasiūlyti upsell arba cross-sell"
    );
  }

  res.json({
    score,
    priority,
    reasons,
    suggestedActions,
  });
});

export default router;
