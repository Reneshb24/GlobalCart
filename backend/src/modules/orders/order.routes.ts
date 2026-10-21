import { Router, type Request, type Response } from "express";
import { prisma } from "../../lib/prisma";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../../middleware/authenticate";
import { cancelOrder, getOrder, listOrders, OrderError } from "./order.service";

const router = Router();
router.use(authenticateToken);

function userIdFrom(req: Request, res: Response): string | null {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

router.get("/", async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;

  try {
    res.status(200).json({ orders: await listOrders(userId) });
  } catch (error) {
    console.error("List orders failed:", error);
    res.status(500).json({ error: "Unable to retrieve orders" });
  }
});

router.post("/:orderId/cancel", async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;

  const orderId = req.params.orderId;
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  ) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  try {
    res.status(200).json(await cancelOrder(userId, orderId));
  } catch (error) {
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Cancel order failed:", error);
    res.status(500).json({ error: "Unable to cancel order" });
  }
});
router.get("/:orderId", async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;

  const orderId = req.params.orderId;
  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  ) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  try {
    res.status(200).json({ order: await getOrder(userId, orderId) });
  } catch (error) {
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Get order failed:", error);
    res.status(500).json({ error: "Unable to retrieve order" });
  }
});


router.get("/:orderId/shipments", async (req: Request, res: Response) => {
  const userId = userIdFrom(req, res);
  if (!userId) return;

  const rawId = req.params.orderId;
  const orderId = Array.isArray(rawId) ? rawId[0] : rawId;

  if (
    typeof orderId !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orderId)
  ) {
    res.status(400).json({ error: "Invalid order ID" });
    return;
  }

  try {
    const order = await prisma.order.findFirst({
      where: { id: orderId, userId },
      select: { id: true }
    });

    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }

    const shipments = await prisma.shipment.findMany({
      where: { orderId },
      select: {
        id: true,
        carrier: true,
        trackingNumber: true,
        status: true,
        shippedAt: true,
        estimatedDelivery: true,
        deliveredAt: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: "desc" }
    });

    res.json({ shipments, count: shipments.length });
  } catch (error) {
    console.error("Shipment tracking lookup failed:", error);
    res.status(500).json({ error: "Unable to retrieve shipment tracking" });
  }
});

export default router;



