"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const env_1 = require("../config/env");
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
const DEFAULT_CHAT_SYSTEM_PROMPT = [
    "Tu esi CRM asistentas.",
    "Atsakyk lietuviskai, konkreciai ir prie esmes.",
    "Jei truksta duomenu, pirmiausia paprasyk paaiskinimo vietoje spejimu.",
    "Remkis tik tuo, ka pateikia naudotojas arba CRM kontekstas.",
].join(" ");
const OUTREACH_SYSTEM_PROMPT = [
    "Veiki kaip vyresnysis account manager'is, kuris raso atsakymus klientams.",
    "Tonacija profesionali, draugiska ir orientuota i verslo tiksla.",
    "Lietuviska kalba, aiskus kvietimas veikti ir konkretus tolesnis zingsnis.",
    "Nenaudok bendru fraziu, personalizuok turini remdamasis CRM kontekstu.",
].join(" ");
function diffInDays(date) {
    if (!date)
        return null;
    const value = date instanceof Date ? date : new Date(date);
    return Math.round((Date.now() - value.getTime()) / (1000 * 60 * 60 * 24));
}
function resolveContactName(contact) {
    const parts = [contact.firstName, contact.lastName].filter(Boolean).join(" ").trim();
    return parts || contact.email || "Nezinomas kontaktas";
}
function computeContactMetrics(contact) {
    const dealsSorted = [...contact.deals].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    const wonDeals = dealsSorted.filter((deal) => deal.stage === "won");
    const referenceDeal = wonDeals[0] || dealsSorted[0];
    return {
        lastOrderAmount: referenceDeal?.amount ?? 0,
        totalOrders: wonDeals.length,
        daysSinceLastOrder: referenceDeal
            ? diffInDays(referenceDeal.updatedAt || referenceDeal.createdAt)
            : null,
        daysSinceLastActivity: contact.activities.length
            ? diffInDays(contact.activities[0].createdAt)
            : null,
    };
}
function buildContactSnapshot(contact, metrics) {
    const ownerName = contact.owner
        ? [contact.owner.firstName, contact.owner.lastName].filter(Boolean).join(" ").trim()
        : "";
    const lines = [
        `Vardas: ${resolveContactName(contact)}`,
        `El. pastas: ${contact.email || "-"}`,
        `Imone: ${contact.company || "-"}`,
        `Telefonas: ${contact.phone || "-"}`,
        `Lifecycle stage: ${contact.lifecycleStage || "-"}`,
    ];
    if (ownerName) {
        lines.push(`Atsakingas vadybininkas: ${ownerName}`);
    }
    if (contact.tags?.length) {
        lines.push(`Zymes: ${contact.tags.join(", ")}`);
    }
    lines.push(`Paskutinio uzsakymo suma: ${metrics.lastOrderAmount.toFixed(2)} EUR`, `VISO uzsakymu: ${metrics.totalOrders}`, `Dienos nuo paskutinio uzsakymo: ${metrics.daysSinceLastOrder ?? "-"}`, `Dienos nuo paskutinio kontakto: ${metrics.daysSinceLastActivity ?? "-"}`);
    return lines.join("\n");
}
function summarizeDealsForPrompt(deals) {
    if (!deals.length) {
        return "- Nera aktyviu sandoriu.";
    }
    return deals
        .slice(0, 5)
        .map((deal) => {
        const amount = typeof deal.amount === "number" ? `${deal.amount.toFixed(2)} ${deal.currency}` : "suma nenurodyta";
        return `- ${deal.title} (${deal.stage}, ${amount})`;
    })
        .join("\n");
}
function summarizeActivitiesForPrompt(activities) {
    if (!activities.length) {
        return "- Nera registruotu veiklu.";
    }
    return activities
        .slice(0, 5)
        .map((activity) => {
        const subject = activity.subject ? ` - ${activity.subject}` : "";
        return `- ${activity.type}${subject} (${activity.completed ? "uzbaigta" : "atvira"})`;
    })
        .join("\n");
}
async function callGroq(messages, model) {
    if (!env_1.env.GROQ_API_KEY) {
        throw new Error("GROQ_DISABLED");
    }
    const { data } = await axios_1.default.post("https://api.groq.com/openai/v1/chat/completions", {
        model: model || env_1.env.GROQ_MODEL,
        messages,
    }, {
        headers: {
            Authorization: `Bearer ${env_1.env.GROQ_API_KEY}`,
            "Content-Type": "application/json",
        },
        timeout: 60000,
    });
    return {
        reply: data?.choices?.[0]?.message?.content?.trim() || "",
        usage: data?.usage || null,
    };
}
async function generateWithLLM(messages, primaryModel) {
    if (!env_1.env.GROQ_API_KEY) {
        throw new Error("NO_AI_CONFIGURED");
    }
    try {
        return await callGroq(messages, primaryModel);
    }
    catch (err) {
        console.error("AI provider error", err?.response?.data || err?.message);
        err.code = err.code || "ALL_PROVIDERS_FAILED";
        throw err;
    }
}
/**
 * POST /api/v1/ai/chat
 */
router.post("/chat", async (req, res) => {
    const { prompt, system, model } = req.body;
    if (!prompt?.trim()) {
        return res.status(400).json({ message: "Prompt privalomas" });
    }
    const messages = [
        {
            role: "system",
            content: system || DEFAULT_CHAT_SYSTEM_PROMPT,
        },
        {
            role: "user",
            content: prompt,
        },
    ];
    try {
        const result = await generateWithLLM(messages, model);
        res.json(result);
    }
    catch (error) {
        if (error?.message === "NO_AI_CONFIGURED") {
            return res.status(400).json({
                message: "AI integracija nesukonfigūruota. Nurodyk GROQ_API_KEY.",
            });
        }
        const isTimeout = error?.code === "ECONNABORTED" ||
            (typeof error?.message === "string" &&
                error.message.toLowerCase().includes("timeout"));
        const isProviderIssue = error?.code === "ALL_PROVIDERS_FAILED" ||
            error?.response?.data?.error?.code === "model_decommissioned";
        if (isTimeout || isProviderIssue) {
            const fallback = "Sveiki,\n\nSiuo metu AI servisas trumpam nepasiekiamas. Pabandyk dar karta po keliu akimirku.\n\n" +
                "Jei reikia skubaus atsakymo, reaguok rankiniu budu.\n";
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
    const { organizationId } = req.user;
    const { contactId, prompt } = req.body;
    if (!contactId || !prompt?.trim()) {
        return res.status(400).json({ message: "Truksta kontakto arba prompt" });
    }
    const contact = await prisma_1.prisma.contact.findFirst({
        where: { id: contactId, organizationId },
        include: {
            owner: {
                select: { firstName: true, lastName: true },
            },
            deals: {
                orderBy: { updatedAt: "desc" },
            },
            activities: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    });
    if (!contact) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    const extendedContact = contact;
    const metrics = computeContactMetrics(extendedContact);
    const contactSnapshot = buildContactSnapshot(extendedContact, metrics);
    const dealsSummary = summarizeDealsForPrompt(extendedContact.deals);
    const activitiesSummary = summarizeActivitiesForPrompt(extendedContact.activities);
    const userPrompt = [
        "CRM kontekstas:",
        contactSnapshot,
        "",
        "Paskutiniai deal'ai:",
        dealsSummary,
        "",
        "Paskutines veiklos:",
        activitiesSummary,
        "",
        "Kliento zinute ar papildomas kontekstas:",
        prompt.trim(),
        "",
        "Uzdotis: paruos profesionalu atsakyma lietuviskai (2-3 pastraipos) su aiskia rekomendacija arba veiksmo kvietimu. Jei truksta duomenu, pasiulyk ko reikia, bet neisigalvok faktu.",
    ].join("\n");
    try {
        const result = await generateWithLLM([
            { role: "system", content: OUTREACH_SYSTEM_PROMPT },
            {
                role: "user",
                content: userPrompt,
            },
        ]);
        res.json(result);
    }
    catch (error) {
        console.error("generate-reply error", error?.response?.data || error?.message);
        if (error?.message === "NO_AI_CONFIGURED") {
            return res.status(400).json({
                message: "AI integracija nesukonfiguruota. Nurodyk GROQ_API_KEY.",
            });
        }
        const isTimeout = error?.code === "ECONNABORTED" ||
            (typeof error?.message === "string" &&
                error.message.toLowerCase().includes("timeout"));
        const isProviderIssue = error?.code === "ALL_PROVIDERS_FAILED" ||
            error?.response?.data?.error?.code === "model_decommissioned";
        if (isTimeout || isProviderIssue) {
            const fallback = `Sveiki,

Deja, AI servisas neatsake laiku. Pabandyk dar karta po keliu akimirku arba pasinaudok sia istrauka:

${prompt}

Pagarbiai,
CRM komanda`;
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
    const body = req.body;
    let score = 0;
    const reasons = [];
    const suggestedActions = [];
    if (body.lifecycleStage === "customer") {
        score += 20;
        reasons.push("Jau esamas klientas");
    }
    else if (body.lifecycleStage === "lead") {
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
    if (score < 0)
        score = 0;
    if (score > 100)
        score = 100;
    let priority = "low";
    if (score >= 70)
        priority = "high";
    else if (score >= 40)
        priority = "medium";
    if (priority === "high") {
        suggestedActions.push("Paskambinti šiandien", "Pasiūlyti aukštesnį planą");
    }
    else if (priority === "medium") {
        suggestedActions.push("Išsiųsti personalizuotą el. laišką");
    }
    else {
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
    const { organizationId } = req.user;
    const { id } = req.params;
    const contact = await prisma_1.prisma.contact.findFirst({
        where: { id, organizationId },
        include: {
            owner: {
                select: { firstName: true, lastName: true },
            },
            deals: {
                orderBy: { updatedAt: "desc" },
            },
            activities: {
                orderBy: { createdAt: "desc" },
                take: 5,
            },
        },
    });
    if (!contact) {
        return res.status(404).json({ message: "Kontaktas nerastas" });
    }
    const extendedContact = contact;
    const metrics = computeContactMetrics(extendedContact);
    let score = 50;
    const reasons = [];
    const suggestedActions = [];
    if (extendedContact.deals.some((d) => d.stage === "won")) {
        score += 20;
        reasons.push("Turi laimetu sandoriu");
    }
    if (metrics.totalOrders > 1) {
        score += 10;
        reasons.push("Istoriskai pirko ne karta");
    }
    if (metrics.daysSinceLastOrder !== null) {
        if (metrics.daysSinceLastOrder <= 30) {
            score += 10;
            reasons.push("Neseniai pirko");
        }
        else if (metrics.daysSinceLastOrder > 120) {
            score -= 10;
            reasons.push("Seniai nebuvome sandoryje");
        }
    }
    if (extendedContact.lifecycleStage === "customer") {
        score += 10;
        reasons.push("Esamas klientas");
    }
    else if (extendedContact.lifecycleStage &&
        extendedContact.lifecycleStage.toLowerCase().includes("churn")) {
        score -= 15;
        reasons.push("Pazymetas kaip churn rizika");
    }
    if (extendedContact.tags?.includes("vip")) {
        score += 15;
        reasons.push("VIP zyma");
    }
    const openDeals = extendedContact.deals.filter((deal) => ["proposal", "negotiation", "qualified"].includes(deal.stage));
    if (openDeals.length) {
        score += 10;
        reasons.push("Yra aktyviu deal'u");
        suggestedActions.push(`Sekti deal'a "${openDeals[0].title}" ir pajudinti etapa`);
    }
    const lastActivity = extendedContact.activities[0];
    if (!lastActivity) {
        score += 10;
        reasons.push("Dar nebuvo jokio veiksmo - verta susisiekti");
        suggestedActions.push("Paskambinti ir prisistatyti");
    }
    else {
        const daysSinceLastActivity = metrics.daysSinceLastActivity ??
            Math.round((Date.now() - new Date(lastActivity.createdAt).getTime()) /
                (1000 * 60 * 60 * 24));
        if (daysSinceLastActivity > 45) {
            score -= 10;
            reasons.push("Seniai buvo kontaktas");
            suggestedActions.push("Issiusti follow-up el. laiska");
        }
        else if (daysSinceLastActivity > 14) {
            reasons.push("Kontaktas nebuvo apklaustas kelias savaites");
            suggestedActions.push("Priminti apie pasiulyta verte el. laisku");
        }
        else {
            reasons.push("Neseniai buvo kontaktas");
        }
    }
    if (!extendedContact.deals.length &&
        (!extendedContact.lifecycleStage || extendedContact.lifecycleStage === "lead")) {
        suggestedActions.push("Pakviesti i demo arba konsultacija");
    }
    if (score < 0)
        score = 0;
    if (score > 100)
        score = 100;
    let priority = "medium";
    if (score >= 75)
        priority = "high";
    else if (score <= 40)
        priority = "low";
    if (priority === "high") {
        suggestedActions.push("Skambutis siandien", "Pasiulyti upsell arba cross-sell");
    }
    const dealsForUi = extendedContact.deals.slice(0, 5).map((deal) => ({
        id: deal.id,
        title: deal.title,
        amount: deal.amount,
        currency: deal.currency,
        stage: deal.stage,
        createdAt: deal.createdAt,
    }));
    const activitiesForUi = extendedContact.activities.slice(0, 5).map((activity) => ({
        id: activity.id,
        type: activity.type,
        subject: activity.subject,
        dueDate: activity.scheduledAt ? activity.scheduledAt.toISOString() : null,
        completed: activity.completed,
        createdAt: activity.createdAt,
    }));
    res.json({
        contactId: extendedContact.id,
        contactName: resolveContactName(extendedContact),
        email: extendedContact.email,
        phone: extendedContact.phone,
        company: extendedContact.company,
        lifecycleStage: extendedContact.lifecycleStage,
        tags: extendedContact.tags || [],
        metrics,
        score,
        priority,
        reasons,
        suggestedActions,
        deals: dealsForUi,
        activities: activitiesForUi,
    });
});
exports.default = router;
