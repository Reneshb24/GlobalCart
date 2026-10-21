
import { Router, type Request, type Response } from "express";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../../middleware/authenticate";
import {
  addCartItem,
  clearCart,
  CartError,
  getCart,
  removeCartItem,
  updateCartItem
} from "./cart.service";
import {
  addCartItemSchema,
  updateCartItemSchema
} from "./cart.schemas";

const cartRouter = Router();

cartRouter.use(authenticateToken);

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as AuthenticatedRequest).auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  return userId;
}

function handleCartError(
  res: Response,
  error: unknown,
  operation: string
): void {
  if (error instanceof CartError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error(`${operation} failed:`, error);
  res.status(500).json({ error: "Unable to process cart request" });
}

cartRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    res.status(200).json(await getCart(userId));
  } catch (error) {
    handleCartError(res, error, "Retrieve cart");
  }
});

cartRouter.post("/items", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const parsed = addCartItemSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid cart item",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    res.status(200).json(
      await addCartItem(userId, parsed.data)
    );
  } catch (error) {
    handleCartError(res, error, "Add cart item");
  }
});

cartRouter.patch(
  "/items/:itemId",
  async (req: Request, res: Response) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const itemId = req.params.itemId;

    if (typeof itemId !== "string") {
      res.status(400).json({ error: "Invalid cart item ID" });
      return;
    }

    const parsed = updateCartItemSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid cart item quantity",
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    try {
      res.status(200).json(
        await updateCartItem(userId, itemId, parsed.data)
      );
    } catch (error) {
      handleCartError(res, error, "Update cart item");
    }
  }
);

cartRouter.delete(
  "/items/:itemId",
  async (req: Request, res: Response) => {
    const userId = getUserId(req, res);
    if (!userId) return;

    const itemId = req.params.itemId;

    if (typeof itemId !== "string") {
      res.status(400).json({ error: "Invalid cart item ID" });
      return;
    }

    try {
      res.status(200).json(
        await removeCartItem(userId, itemId)
      );
    } catch (error) {
      handleCartError(res, error, "Remove cart item");
    }
  }
);

cartRouter.delete("/", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    res.status(200).json(await clearCart(userId));
  } catch (error) {
    handleCartError(res, error, "Clear cart");
  }
});

export default cartRouter;
