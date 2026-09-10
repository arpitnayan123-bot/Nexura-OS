import { db } from "@/lib/db";

/* ============================================================
   NEXURA OS v5 — TENANCY CORE
   A Tenant is the commercial aggregate above hospitals (a group,
   an NGO network, a government cluster). Hospitals keep working
   exactly as before when tenantId is null (single-tenant mode).
   ============================================================ */

export interface TenantBranding {
  primary?: string;
  logoText?: string;
  locale?: string;
  defaultTheme?: "light" | "dark";
}

export interface TenantSettings {
  offlineMode?: boolean;
  retentionProfile?: "default" | "strict" | "long";
  aiThresholds?: boolean;
}

export function parseBranding(tenant: { brandingJson: string | null }): TenantBranding {
  try {
    return tenant.brandingJson ? JSON.parse(tenant.brandingJson) : {};
  } catch {
    return {};
  }
}

export function parseModules(tenant: { modulesJson: string | null }): string[] | null {
  try {
    return tenant.modulesJson ? JSON.parse(tenant.modulesJson) : null;
  } catch {
    return null;
  }
}

export function parseDomains(tenant: { domainsJson: string | null }): string[] {
  try {
    return tenant.domainsJson ? JSON.parse(tenant.domainsJson) : [];
  } catch {
    return [];
  }
}

export function parseSettings(tenant: { settingsJson: string | null }): TenantSettings {
  try {
    return tenant.settingsJson ? JSON.parse(tenant.settingsJson) : {};
  } catch {
    return {};
  }
}

/** Resolve the tenant a hospital belongs to (null = un-tenant'd single hospital). */
export async function tenantForHospital(hospitalId: string) {
  const h = await db.hospital.findUnique({
    where: { id: hospitalId },
    select: { tenantId: true },
  });
  if (!h?.tenantId) return null;
  return db.nxTenant.findUnique({ where: { id: h.tenantId } });
}

/** All hospital ids visible to a tenant. */
export async function hospitalIdsForTenant(tenantId: string): Promise<string[]> {
  const rows = await db.hospital.findMany({
    where: { tenantId },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

/** Is a module key enabled for this tenant? null modulesJson = everything standard. */
export function moduleEnabledForTenant(tenant: { modulesJson: string | null } | null, moduleKey: string): boolean {
  if (!tenant) return true;
  const mods = parseModules(tenant);
  if (!mods) return true;
  return mods.includes(moduleKey);
}
