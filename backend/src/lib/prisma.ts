import "dotenv/config";
import "./dns-setup";
import { PrismaClient } from "../generated/prisma/client";

const rawUrl = process.env.DATABASE_URL;
let connectionUrl = rawUrl;
if (connectionUrl && connectionUrl.includes("globalcart-dev-21865.jxf.gcp-asia-south1.cockroachlabs.cloud")) {
  connectionUrl = connectionUrl.replace(
    "globalcart-dev-21865.jxf.gcp-asia-south1.cockroachlabs.cloud:26257/defaultdb?sslmode=verify-full",
    "34.14.187.94:26257/globalcart-dev-21865.defaultdb?sslmode=require"
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: connectionUrl ? { db: { url: connectionUrl } } : undefined
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
