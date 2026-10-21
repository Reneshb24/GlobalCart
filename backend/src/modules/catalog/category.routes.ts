import { Router } from "express";
import { getCategoryBySlug, listCategories } from "./category.service";

const categoryRouter = Router();

categoryRouter.get("/", async (_req, res) => {
  try {
    const categories = await listCategories();
    res.status(200).json({ categories });
  } catch (error) {
    console.error("Category listing failed:", error);
    res.status(500).json({
      error: "Unable to retrieve categories"
    });
  }
});

categoryRouter.get("/:slug", async (req, res) => {
  try {
    const category = await getCategoryBySlug(req.params.slug);

    if (!category) {
      res.status(404).json({
        error: "Category not found"
      });
      return;
    }

    res.status(200).json({ category });
  } catch (error) {
    console.error("Category lookup failed:", error);
    res.status(500).json({
      error: "Unable to retrieve category"
    });
  }
});

export default categoryRouter;
