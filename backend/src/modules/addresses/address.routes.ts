import { Router, type Request, type Response } from "express";
import {
  authenticateToken,
  type AuthenticatedRequest
} from "../../middleware/authenticate";
import {
  createAddressSchema,
  updateAddressSchema
} from "./address.schemas";
import {
  AddressError,
  createAddress,
  deleteAddress,
  listAddresses,
  updateAddress
} from "./address.service";

const router = Router();
router.use(authenticateToken);

function getUserId(req: Request, res: Response): string | null {
  const userId = (req as AuthenticatedRequest).auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }

  return userId;
}

function parseAddressId(value: unknown): string | null {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : null;
}

function handleError(res: Response, error: unknown) {
  if (error instanceof AddressError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }

  console.error("Address request failed:", error);
  res.status(500).json({ error: "Unable to process address request" });
}

router.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  try {
    res.status(200).json({ addresses: await listAddresses(userId) });
  } catch (error) {
    handleError(res, error);
  }
});

router.post("/", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const parsed = createAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid address",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    res.status(201).json({
      address: await createAddress(userId, parsed.data)
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.patch("/:addressId", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const addressId = parseAddressId(req.params.addressId);
  if (!addressId) {
    res.status(400).json({ error: "Invalid address ID" });
    return;
  }

  const parsed = updateAddressSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid address update",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    res.status(200).json({
      address: await updateAddress(userId, addressId, parsed.data)
    });
  } catch (error) {
    handleError(res, error);
  }
});

router.delete("/:addressId", async (req: Request, res: Response) => {
  const userId = getUserId(req, res);
  if (!userId) return;

  const addressId = parseAddressId(req.params.addressId);
  if (!addressId) {
    res.status(400).json({ error: "Invalid address ID" });
    return;
  }

  try {
    res.status(200).json(await deleteAddress(userId, addressId));
  } catch (error) {
    handleError(res, error);
  }
});

export default router;
