import { NextRequest } from "next/server";
import { verifyToken } from "@/lib/auth/jwt";

/* ============================================================
   NEXURA OS — session + deterministic RBAC
   Role → module gating enforced server-side. The UI mirrors
   this map, but every API route re-checks permissions here.
   ============================================================ */

export type NxRole =
  | "leadership"
  | "command"
  | "doctor"
  | "nurse"
  | "lab"
  | "pharmacist"
  | "facilities"
  | "reception"
  | "admin";

export interface NxSession {
  userId: string;
  name: string;
  role: NxRole;
  department?: string;
  hospitalId?: string;
}

export const MODULES = [
  "command-center",
  "patients",
  "journey",
  "tasks",
  "schedule",
  "beds",
  "ed",
  "doctor",
  "nurse",
  "or",
  "labs",
  "pharmacy",
  "orders",
  "billing",
  "inventory",
  "equipment",
  "analytics",
  "incidents",
  "automations",
  "messages",
  "audit",
  "integrations",
  "admin",
] as const;
export type NxModule = (typeof MODULES)[number];

const ROLE_MODULES: Record<NxRole, NxModule[]> = {
  leadership: ["command-center", "analytics", "incidents", "billing", "audit", "schedule", "integrations", "admin"],
  command: ["command-center", "beds", "tasks", "incidents", "journey", "patients", "ed", "or", "schedule", "messages", "audit", "equipment", "integrations"],
  doctor: ["doctor", "patients", "journey", "orders", "tasks", "labs", "pharmacy", "or", "schedule", "messages", "incidents", "beds", "ed", "analytics"],
  nurse: ["nurse", "tasks", "beds", "patients", "journey", "medication" as NxModule, "orders", "messages", "incidents", "ed", "schedule"],
  lab: ["labs", "orders", "tasks", "patients", "messages", "incidents"],
  pharmacist: ["pharmacy", "orders", "inventory", "tasks", "patients", "messages", "incidents"],
  facilities: ["beds", "equipment", "tasks", "incidents", "messages"],
  reception: ["schedule", "patients", "tasks", "billing", "messages", "ed"],
  admin: MODULES as unknown as NxModule[],
};

export function modulesForRole(role: NxRole): NxModule[] {
  const mods = ROLE_MODULES[role] || [];
  return Array.from(new Set(mods)).filter((m) => MODULES.includes(m as NxModule));
}

export function canAccessModule(role: NxRole, module: string): boolean {
  return modulesForRole(role).includes(module as NxModule);
}

/** Extract and verify the Nx session from the request cookie. */
export function getSession(req: NextRequest): NxSession | null {
  const token = req.cookies.get("nx_access")?.value;
  if (!token) return null;
  const decoded = verifyToken(token);
  if (!decoded) return null;
  return {
    userId: decoded.userId,
    name: decoded.name,
    role: decoded.role as NxRole,
    hospitalId: (decoded as unknown as { hospitalId?: string }).hospitalId,
  };
}

export function requireModule(req: NextRequest, module: string): { session: NxSession } | { error: string; status: number } {
  const session = getSession(req);
  if (!session) return { error: "unauthenticated", status: 401 };
  // Admin bypasses; everyone else needs explicit module access
  if (session.role !== "admin" && !canAccessModule(session.role, module)) {
    return { error: "forbidden_module", status: 403 };
  }
  return { session };
}
