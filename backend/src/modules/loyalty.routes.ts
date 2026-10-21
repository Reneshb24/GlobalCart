import { Router, type Request } from "express";
import { Prisma } from "../generated/prisma/client";
import { prisma } from "../lib/prisma";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../middleware/authenticate";

const router = Router();
router.use(authenticateToken);

function userIdFrom(req: Request): string | undefined {
  return (req as AuthenticatedRequest).auth?.userId;
}

router.get("/", async (req, res) => {
  const userId = userIdFrom(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const account = await prisma.loyaltyAccount.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 50
        }
      }
    });

    res.json({
      account: {
        id: account.id,
        pointsBalance: account.pointsBalance,
        tier: account.tier,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt
      },
      transactions: account.transactions
    });
  } catch {
    res.status(500).json({ error: "Unable to retrieve loyalty account" });
  }
});

export default router;
