import { Router, type Request, type Response } from "express";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middleware/authenticate";

const router = Router();
router.use(authenticateToken);

const requestSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().trim().min(3).max(1000),
  items: z.array(z.object({
    orderItemId: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
    reason: z.string().trim().min(3).max(500).optional()
  }).strict()).min(1).max(50)
}).strict().refine(
  data => new Set(data.items.map(item => item.orderItemId)).size === data.items.length,
  { message: "Duplicate order items are not allowed" }
);

function currentUserId(req: Request): string | null {
  return (req as AuthenticatedRequest).auth?.userId ?? null;
}

router.get("/", async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const returns = await prisma.returnRequest.findMany({
      where: { userId },
      include: {
        items: { include: { orderItem: true } },
        refunds: true
      },
      orderBy: { requestedAt: "desc" }
    });
    res.json({ returns, count: returns.length });
  } catch (error) {
    console.error("List returns failed:", error);
    res.status(500).json({ error: "Unable to retrieve return requests" });
  }
});

router.post("/", async (req: Request, res: Response) => {
  const userId = currentUserId(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = requestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid return request",
      details: parsed.error.issues
    });
    return;
  }

  try {
    const created = await prisma.$transaction(async tx => {
      const order = await tx.order.findFirst({
        where: { id: parsed.data.orderId, userId },
        include: { items: true }
      });

      if (!order) {
        return { error: "Order not found", status: 404 as const };
      }

      if (order.status !== "DELIVERED") {
        return {
          error: "Only delivered orders can be returned",
          status: 409 as const
        };
      }

      const orderItems = new Map(order.items.map(item => [item.id, item]));
      const selectedIds = parsed.data.items.map(item => item.orderItemId);

      for (const item of parsed.data.items) {
        const orderItem = orderItems.get(item.orderItemId);
        if (!orderItem) {
          return {
            error: "An item does not belong to this order",
            status: 400 as const
          };
        }

        const priorItems = await tx.returnItem.findMany({
          where: {
            orderItemId: item.orderItemId,
            returnRequest: {
              status: { notIn: ["REJECTED", "CLOSED"] }
            }
          },
          select: { quantity: true }
        });

        const alreadyRequested = priorItems.reduce((sum, row) => sum + row.quantity, 0);
        if (alreadyRequested + item.quantity > orderItem.quantity) {
          return {
            error: `Requested return quantity exceeds the eligible quantity for ${orderItem.productName}`,
            status: 409 as const
          };
        }
      }

      const createdReturn = await tx.returnRequest.create({
        data: {
          returnNumber: `RET-${Date.now()}-${randomUUID().slice(0, 8).toUpperCase()}`,
          orderId: order.id,
          userId,
          reason: parsed.data.reason,
          status: "REQUESTED",
          items: {
            create: parsed.data.items.map(item => ({
              orderItemId: item.orderItemId,
              quantity: item.quantity,
              reason: item.reason ?? null
            }))
          }
        },
        include: { items: { include: { orderItem: true } } }
      });

      return { returnRequest: createdReturn };
    });

    if ("error" in created) {
      res.status(created.status ?? 500).json({ error: created.error });
      return;
    }

    res.status(201).json(created);
  } catch (error) {
    console.error("Create return request failed:", error);
    res.status(500).json({ error: "Unable to create return request" });
  }
});

export default router;



