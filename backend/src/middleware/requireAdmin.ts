import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import type { AuthenticatedRequest } from "./authenticate";

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const userId = (req as AuthenticatedRequest).auth?.userId;

  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true, isActive: true }
    });

    if (!user || !user.isActive) {
      res.status(401).json({ error: "Account unavailable" });
      return;
    }

    if (user.role !== "ADMIN") {
      res.status(403).json({ error: "Administrator access required" });
      return;
    }

    next();
  } catch (error) {
    console.error("Admin authorization failed:", error);
    res.status(500).json({ error: "Unable to verify administrator access" });
  }
}
