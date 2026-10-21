import { Router, type Request, type Response } from "express";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../../middleware/authenticate";
import { checkoutSchema } from "./checkout.schemas";
import { checkout, OrderError } from "./order.service";

const router = Router();
router.use(authenticateToken);

router.post("/", async (req: Request, res: Response) => {
  const userId = (req as AuthenticatedRequest).auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  const parsed = checkoutSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid checkout request",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    res.status(201).json(await checkout(userId, parsed.data));
  } catch (error) {
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Checkout failed:", error);
    res.status(500).json({ error: "Unable to complete checkout" });
  }
});

export default router;
