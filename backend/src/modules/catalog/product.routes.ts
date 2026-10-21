import { Router } from "express";
import { z } from "zod";
import { getProductBySlug, listProducts } from "./product.service";

const productRouter = Router();

const productQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  category: z.string().trim().min(1).max(100).optional(),
  minPrice: z.coerce.number().finite().min(0).optional(),
  maxPrice: z.coerce.number().finite().min(0).optional(),
  sort: z.enum(["newest", "price_asc", "price_desc", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12)
}).refine(
  (query) =>
    query.minPrice === undefined ||
    query.maxPrice === undefined ||
    query.minPrice <= query.maxPrice,
  {
    message: "minPrice cannot exceed maxPrice",
    path: ["minPrice"]
  }
);

productRouter.get("/", async (req, res) => {
  const parsed = productQuerySchema.safeParse(req.query);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid product filters",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    const result = await listProducts(parsed.data);
    res.status(200).json(result);
  } catch (error) {
    console.error("Product listing failed:", error);
    res.status(500).json({
      error: "Unable to retrieve products"
    });
  }
});

productRouter.get("/:slug", async (req, res) => {
  try {
    const product = await getProductBySlug(req.params.slug);

    if (!product) {
      res.status(404).json({
        error: "Product not found"
      });
      return;
    }

    res.status(200).json({ product });
  } catch (error) {
    console.error("Product lookup failed:", error);
    res.status(500).json({
      error: "Unable to retrieve product"
    });
  }
});

export default productRouter;
