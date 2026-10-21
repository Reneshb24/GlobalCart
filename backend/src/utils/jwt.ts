import jwt from "jsonwebtoken";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 64) {
    throw new Error(
      "JWT_SECRET must be configured with at least 64 characters."
    );
  }

  return secret;
}

export interface AuthTokenPayload {
  userId: string;
  role: string;
}

export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "1h",
    issuer: "globalcart-api",
    audience: "globalcart-client"
  });
}

export function verifyAuthToken(token: string): AuthTokenPayload {
  const decoded = jwt.verify(token, getJwtSecret(), {
    issuer: "globalcart-api",
    audience: "globalcart-client"
  });

  if (
    typeof decoded === "string" ||
    typeof decoded.userId !== "string" ||
    typeof decoded.role !== "string"
  ) {
    throw new Error("Invalid authentication token payload.");
  }

  return {
    userId: decoded.userId,
    role: decoded.role
  };
}
