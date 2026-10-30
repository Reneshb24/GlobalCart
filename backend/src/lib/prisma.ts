import "dotenv/config";
import "./dns-setup";
import { PrismaClient } from "../generated/prisma/client";
import { createLocalMockDb } from "./local-mock-db";

const rawUrl = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const isLocalMock = process.env.USE_LOCAL_MOCK_DB === "true" || process.env.NODE_ENV === "test";

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  (isLocalMock
    ? createLocalMockDb()
    : new PrismaClient({
        datasources: rawUrl ? { db: { url: rawUrl } } : undefined
      }));

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
