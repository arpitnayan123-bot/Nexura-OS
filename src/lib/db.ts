import { PrismaClient } from "@prisma/client";

/* ============================================================
   NEXURA OS — PRISMA CLIENT
   The globalThis cache is the Prisma-recommended pattern: it is a
   CONNECTION cache, not application state. No business data lives
   here — every query reads/writes the shared Postgres cluster, so
   any instance behaves identically regardless of which process
   served the request. Caching avoids re-creating the engine (and
   exhausting connections) across dev-HMR reloads / serverless
   invocations. See PRODUCTION_STATUS.md → "Where state lives".
   ============================================================ */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
