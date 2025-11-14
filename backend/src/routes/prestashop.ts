import { Router } from "express";
import { prisma } from "../config/prisma";
import { authMiddleware } from "../middleware/auth";
import axios from "axios";

const router = Router();

router.use(authMiddleware);

/**
 * POST /api/v1/prestashop/sync-orders
 * Body: { limit?: number }
 */
router.post("/sync-orders", async (req, res) => {
  const { organizationId } = req.user!;
  const { limit = 20 } = req.body || {};

  const org = await prisma.organization.findUnique({
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

    const response = await axios.get(url, {
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
      const customerEmail =
        order?.email ||
        order?.customer?.email ||
        order?.customer_email ||
        order?.customer?.email1 ||
        null;

      if (!customerEmail) {
        continue;
      }

      let contact = await prisma.contact.findFirst({
        where: {
          organizationId,
          email: customerEmail
        }
      });

      if (!contact) {
        contact = await prisma.contact.create({
          data: {
            organizationId,
            email: customerEmail,
            firstName: order?.customer?.firstname || null,
            lastName: order?.customer?.lastname || null,
            lifecycleStage: "customer"
          }
        });
      }

      const amount =
        Number(order?.total_paid) ||
        Number(order?.total_paid_tax_incl) ||
        Number(order?.total_paid_real) ||
        0;
      const currency =
        order?.currency_code ||
        order?.currency?.iso_code ||
        order?.currency_code_iso ||
        "EUR";
      const reference = order?.reference || order?.id || `Order-${Date.now()}`;

      await prisma.deal.create({
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

    await prisma.organization.update({
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
  } catch (e: any) {
    console.error("PrestaShop sync failed", e);
    return res.status(500).json({
      message: "PrestaShop sinchronizacija nepavyko",
      error: e?.response?.data || e?.message
    });
  }
});

export default router;
