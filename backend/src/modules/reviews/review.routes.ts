import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { authenticateToken, type AuthenticatedRequest } from "../../middleware/authenticate";

const reviewRouter = Router();
const uuidSchema = z.string().uuid();

const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(2).max(120).optional(),
  comment: z.string().trim().min(3).max(3000).optional()
}).refine(
  value => Boolean(value.title || value.comment),
  "Provide a review title or comment"
);

reviewRouter.get("/products/:productId", async (req, res) => {
  const rawProductId = req.params.productId;
  const productId = Array.isArray(rawProductId) ? rawProductId[0] : rawProductId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "ACTIVE",
        category: { isActive: true }
      },
      select: { id: true }
    });

    if (!product) {
      res.status(404).json({ error: "Active product not found" });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { productId, status: "APPROVED" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        rating: true,
        title: true,
        comment: true,
        createdAt: true,
        user: {
          select: { firstName: true }
        }
      }
    });

    const averageRating = reviews.length
      ? Math.round(
          (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length) * 100
        ) / 100
      : null;

    res.json({ reviews, count: reviews.length, averageRating });
  } catch (error) {
    console.error("Review retrieval failed:", error);
    res.status(500).json({ error: "Unable to retrieve reviews" });
  }
});

reviewRouter.post("/products/:productId", authenticateToken, async (req, res) => {
  const rawProductId = req.params.productId;
  const productId = Array.isArray(rawProductId) ? rawProductId[0] : rawProductId;

  if (!uuidSchema.safeParse(productId).success) {
    res.status(400).json({ error: "Invalid product ID" });
    return;
  }

  const parsed = createReviewSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid review",
      details: parsed.error.issues.map(issue => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  const userId = (req as AuthenticatedRequest).auth!.userId;

  try {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        status: "ACTIVE",
        category: { isActive: true }
      },
      select: { id: true }
    });

    if (!product) {
      res.status(404).json({ error: "Active product not found" });
      return;
    }

    const review = await prisma.review.create({
      data: {
        userId,
        productId,
        rating: parsed.data.rating,
        title: parsed.data.title,
        comment: parsed.data.comment,
        status: "PENDING"
      },
      select: {
        id: true,
        productId: true,
        rating: true,
        title: true,
        comment: true,
        status: true,
        createdAt: true
      }
    });

    res.status(201).json({
      message: "Review submitted for moderation",
      review
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      res.status(409).json({ error: "You have already reviewed this product" });
      return;
    }

    console.error("Review submission failed:", error);
    res.status(500).json({ error: "Unable to submit review" });
  }
});

export default reviewRouter;

