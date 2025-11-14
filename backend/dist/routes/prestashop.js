"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../config/prisma");
const auth_1 = require("../middleware/auth");
const axios_1 = __importDefault(require("axios"));
const router = (0, express_1.Router)();
router.use(auth_1.authMiddleware);
/**
 * POST /api/v1/prestashop/sync-orders
 * Body: { limit?: number }
 */
router.post("/sync-orders", async (req, res) => {
    const { organizationId } = req.user;
    const { limit = 20 } = req.body || {};
    const org = await prisma_1.prisma.organization.findUnique({
        where: { id: organizationId }
    });
    if (!org?.prestashopBaseUrl || !org?.prestashopApiKey) {
        return res.status(400).json({
            message: "Nesuvesti PrestaShop integracijos duomenys"
        });
    }
    try {
        const sanitizedBaseUrl = org.prestashopBaseUrl.replace(/\/+$/, "");
        const url = `${sanitizedBaseUrl}/api/orders`;
        const response = await axios_1.default.get(url, {
            params: {
                output_format: "JSON",
                display: "full",
                sort: "[date_add_DESC]",
                limit
            },
            auth: {
                username: org.prestashopApiKey,
                password: ""
            },
            headers: {
                Accept: "application/json"
            },
            timeout: 15000
        });
        const orders = Array.isArray(response.data?.orders)
            ? response.data.orders
            : [];
        let imported = 0;
        for (const order of orders) {
            const customerEmail = order?.email ||
                order?.customer?.email ||
                order?.customer_email ||
                order?.customer?.email1 ||
                null;
            if (!customerEmail) {
                continue;
            }
            let contact = await prisma_1.prisma.contact.findFirst({
                where: {
                    organizationId,
                    email: customerEmail
                }
            });
            if (!contact) {
                contact = await prisma_1.prisma.contact.create({
                    data: {
                        organizationId,
                        email: customerEmail,
                        firstName: order?.customer?.firstname || null,
                        lastName: order?.customer?.lastname || null,
                        lifecycleStage: "customer"
                    }
                });
            }
            const amount = Number(order?.total_paid) ||
                Number(order?.total_paid_tax_incl) ||
                Number(order?.total_paid_real) ||
                0;
            const currency = order?.currency_code ||
                order?.currency?.iso_code ||
                order?.currency_code_iso ||
                "EUR";
            const reference = order?.reference || order?.id || `Order-${Date.now()}`;
            await prisma_1.prisma.deal.create({
                data: {
                    organizationId,
                    contactId: contact.id,
                    title: `Presta order ${reference}`,
                    amount,
                    currency,
                    stage: "won"
                }
            });
            imported++;
        }
        const statusText = `Importuota ${imported} užsakymų (${orders.length} gauta iš PrestaShop)`;
        await prisma_1.prisma.organization.update({
            where: { id: organizationId },
            data: {
                prestashopLastSyncAt: new Date(),
                prestashopLastSyncStatus: statusText
            }
        });
        res.json({
            imported,
            totalFetched: orders.length,
            status: statusText
        });
    }
    catch (e) {
        console.error("PrestaShop sync failed", e);
        return res.status(500).json({
            message: "PrestaShop sinchronizacija nepavyko",
            error: e?.response?.data || e?.message
        });
    }
});
exports.default = router;
