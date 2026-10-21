import type { Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "./authenticate";

export interface VendorRequest extends AuthenticatedRequest {
  vendor?: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    isActive: boolean;
  };
}

export type VendorDependencies = {
  findUser: (userId: string) => Promise<{ email: string; role: string; isActive: boolean } | null>;
  findVendor: (email: string) => Promise<{ id: string; name: string; email: string | null; phone: string | null; isActive: boolean } | null>;
};

export function createRequireVendorMiddleware(dependencies: VendorDependencies) {
  return async function requireVendorWithDeps(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const userId = req.auth?.userId;

    if (!userId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    try {
      const user = await dependencies.findUser(userId);

      if (!user || !user.isActive) {
        res.status(401).json({ error: "Account unavailable" });
        return;
      }

      if (user.role !== "VENDOR") {
        res.status(403).json({ error: "Vendor access required" });
        return;
      }

      const vendor = await dependencies.findVendor(user.email);

      if (!vendor) {
        res.status(403).json({ error: "No vendor profile linked to this account" });
        return;
      }

      if (!vendor.isActive) {
        res.status(403).json({ error: "Vendor account is inactive" });
        return;
      }

      (req as VendorRequest).vendor = vendor;
      next();
    } catch (error) {
      console.error("Vendor authorization failed:", error);
      res.status(500).json({ error: "Unable to verify vendor access" });
    }
  };
}

export const requireVendor = createRequireVendorMiddleware({
  findUser: async (userId: string) => prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, role: true, isActive: true }
  }),
  findVendor: async (email: string) => prisma.vendor.findFirst({
    where: { email }
  })
});
