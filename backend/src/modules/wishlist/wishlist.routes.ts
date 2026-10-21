import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticateToken, type AuthenticatedRequest } from "../../middleware/authenticate";

const wishlistRouter = Router();
const uuidSchema = z.string().uuid();

wishlistRouter.use(authenticateToken);

wishlistRouter.get("/", async (req, res) => {
  const userId = (req as AuthenticatedRequest).auth!.userId;

  try {
    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: {
        items: {
          orderBy: { createdAt: "desc" },
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                sku: true,
                price: true,
                currency: true,
                status: true,
                images: {
                  orderBy: { position: "asc" },
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    res.json({ wishlist });
  } catch (error) {
    console.error("Wishlist retrieval failed:", error);
    res.status(500).json({ error: "Unable to retrieve wishlist" });
  }
});

wishlistRouter.post("/items", async (req, res) => {
  const parsed = z.object({ productId: uuidSchema }).safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "A valid productId is required" });
    return;
  }

  const userId = (req as AuthenticatedRequest).auth!.userId;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: parsed.data.productId,
        status: "ACTIVE",
        category: { isActive: true }
      },
      select: { id: true }
    });

    if (!product) {
      res.status(404).json({ error: "Active product not found" });
      return;
    }

    const wishlist = await prisma.wishlist.upsert({
      where: { userId },
      create: { userId },
      update: {},
      select: { id: true }
    });

    const item = await prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId: product.id
        }
      },
      create: { wishlistId: wishlist.id, productId: product.id },
      update: {},
      include: {
        product: {
          select: { id: true, name: true, slug: true, price: true, currency: true }
        }
      }
    });

    res.status(200).json({ item });
  } catch (error) {
    console.error("Wishlist item addition failed:", error);
    res.status(500).json({ error: "Unable to add product to wishlist" });
  }
});

wishlistRouter.delete("/items/:productId", async (req, res) => {
  const productId = req.params.productId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const userId = (req as AuthenticatedRequest).auth!.userId;

  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (!wishlist) {
      res.status(404).json({ error: "Wishlist not found" });
      return;
    }

    const result = await prisma.wishlistItem.deleteMany({
      where: { wishlistId: wishlist.id, productId }
    });

    if (result.count === 0) {
      res.status(404).json({ error: "Wishlist item not found" });
      return;
    }

    res.json({ message: "Wishlist item removed" });
  } catch (error) {
    console.error("Wishlist item removal failed:", error);
    res.status(500).json({ error: "Unable to remove wishlist item" });
  }
});

wishlistRouter.delete("/", async (req, res) => {
  const userId = (req as AuthenticatedRequest).auth!.userId;

  try {
    const wishlist = await prisma.wishlist.findUnique({
      where: { userId },
      select: { id: true }
    });

    if (wishlist) {
      await prisma.wishlistItem.deleteMany({
        where: { wishlistId: wishlist.id }
      });
    }

    res.json({ message: "Wishlist cleared" });
  } catch (error) {
    console.error("Wishlist clearing failed:", error);
    res.status(500).json({ error: "Unable to clear wishlist" });
  }
});

export default wishlistRouter;
