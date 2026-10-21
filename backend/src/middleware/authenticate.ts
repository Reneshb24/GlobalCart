import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyAuthToken } from "../utils/jwt";

export interface AuthenticatedRequest extends Request {
  auth?: {
    userId: string;
    role: string;
  };
}

type AuthPayload = {
  userId: string;
  role: string;
};

type AuthenticationDependencies = {
  verifyToken: (token: string) => AuthPayload;
  findUser: (userId: string) => Promise<{ isActive: boolean } | null>;
};

export function createAuthenticateTokenMiddleware(
  dependencies: AuthenticationDependencies
) {
  return async function authenticateTokenWithDependencies(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      res.status(401).json({
        error: "Authentication token required"
      });
      return;
    }

    const token = authorization.slice("Bearer ".length).trim();

    if (!token) {
      res.status(401).json({
        error: "Authentication token required"
      });
      return;
    }

    let payload: AuthPayload;

    try {
      payload = dependencies.verifyToken(token);
    } catch {
      res.status(401).json({
        error: "Invalid or expired authentication token"
      });
      return;
    }

    try {
      const user = await dependencies.findUser(payload.userId);

      if (!user || !user.isActive) {
        res.status(401).json({
          error: "Account unavailable"
        });
        return;
      }

      (req as AuthenticatedRequest).auth = {
        userId: payload.userId,
        role: payload.role
      };

      next();
    } catch (error) {
      console.error("Authentication account check failed:", error);
      res.status(500).json({
        error: "Unable to verify account access"
      });
    }
  };
}

export const authenticateToken = createAuthenticateTokenMiddleware({
  verifyToken: verifyAuthToken,
  findUser: async (userId) => prisma.user.findUnique({
    where: { id: userId },
    select: { isActive: true }
  })
});
