import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { Prisma } from "../../generated/prisma/client";
import { prisma } from "../../lib/prisma";
import { authenticateToken, type AuthenticatedRequest } from "../../middleware/authenticate";
import { AuthError, registerUser } from "./auth.service";
import { loginUser } from "./auth.login";
import { loginSchema, registerSchema } from "./auth.schemas";
import bcrypt from "bcryptjs";
import { signAuthToken } from "../../utils/jwt";

const authRouter = Router();

const vendorRegisterSchema = z.object({
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(8).max(72),
  businessName: z.string().trim().min(2).max(150),
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  phone: z.string().trim().max(30).optional(),
  nearestWarehouseId: z.string().uuid().optional()
});

authRouter.post("/register", async (req: Request, res: Response) => {
  const parsed = registerSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid registration details",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    const user = await registerUser(parsed.data);

    res.status(201).json({
      message: "Account created successfully",
      user
    });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Registration failed:", error);

    res.status(500).json({
      error: "Unable to create account"
    });
  }
});

authRouter.post("/register-vendor", async (req: Request, res: Response) => {
  const parsed = vendorRegisterSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid vendor registration details",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  const { email, password, businessName, firstName, lastName, phone, nearestWarehouseId } = parsed.data;

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const existingVendor = await prisma.vendor.findFirst({ where: { email } });
    if (existingVendor) {
      res.status(409).json({ error: "A vendor with this business email is already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          phone: phone || null,
          role: "VENDOR",
          isActive: true
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          createdAt: true
        }
      });

      const vendor = await tx.vendor.create({
        data: {
          name: businessName,
          email,
          phone: phone || null,
          isActive: true
        }
      });

      const token = signAuthToken({
        userId: user.id,
        role: "VENDOR"
      });

      return { token, user, vendor };
    });

    res.status(201).json({
      message: "Vendor business account created successfully",
      token: result.token,
      user: result.user,
      vendor: result.vendor
    });
  } catch (error) {
    console.error("Vendor registration failed:", error);
    res.status(500).json({ error: "Unable to complete vendor registration" });
  }
});

authRouter.get("/warehouses/public", async (_req, res) => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        city: true,
        region: true,
        countryCode: true
      },
      orderBy: { name: "asc" }
    });
    res.json({ warehouses });
  } catch (error) {
    console.error("Public warehouse fetch failed:", error);
    res.status(500).json({ error: "Unable to load warehouses" });
  }
});

authRouter.post("/login", async (req: Request, res: Response) => {
  const parsed = loginSchema.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({
      error: "Invalid login details",
      details: parsed.error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message
      }))
    });
    return;
  }

  try {
    const result = await loginUser(parsed.data);
    res.status(200).json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }

    console.error("Login failed:", error);

    res.status(500).json({
      error: "Unable to log in"
    });
  }
});

authRouter.get(
  "/me",
  authenticateToken,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true
        }
      });

      if (!user || !user.isActive) {
        res.status(401).json({
          error: "Account unavailable"
        });
        return;
      }

      res.status(200).json({ user });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        console.error("Profile lookup failed:", error.code);
      } else {
        console.error("Profile lookup failed");
      }

      res.status(500).json({
        error: "Unable to retrieve profile"
      });
    }
  }
);

const updateProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(80).optional(),
  lastName: z.string().trim().min(1).max(80).optional(),
  phone: z.string().trim().max(30).nullable().optional()
}).strict().refine(
  data => Object.keys(data).length > 0,
  "Provide at least one field to update"
);

authRouter.patch(
  "/me",
  authenticateToken,
  async (req: Request, res: Response) => {
    const authenticatedReq = req as AuthenticatedRequest;
    const userId = authenticatedReq.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: "Invalid profile update",
        details: parsed.error.issues.map(issue => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    try {
      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
          ...(parsed.data.firstName !== undefined ? { firstName: parsed.data.firstName } : {}),
          ...(parsed.data.lastName !== undefined ? { lastName: parsed.data.lastName } : {}),
          ...(parsed.data.phone !== undefined ? { phone: parsed.data.phone || null } : {})
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          phone: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          createdAt: true
        }
      });

      res.status(200).json({
        message: "Profile updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Profile update failed:", error);
      res.status(500).json({ error: "Unable to update profile" });
    }
  }
);

export default authRouter;
