/* ============================================================
   NEXURA OS PLATFORM — INTEGRATION CONTRACTS
   Hospital OS talks to the platform ONLY through these typed
   provider interfaces. `NEXURA_MODE=local` (default) binds the
   local adapters backed by this app's own database;
   `NEXURA_MODE=remote` is the production wiring point — swap in
   adapters that call the Nexura platform services over HTTP.
   Hospital OS never imports platform internals directly.
   ============================================================ */

import type { NxRole } from "@/lib/nx/session";

/* ---------- Identity ---------- */
export interface NexuraIdentity {
  id: string;
  displayName: string;
  email?: string | null;
  roles: string[];
  organizationId?: string | null;
  hospitalId?: string | null;
  avatarUrl?: string | null;
}

export interface IdentityProvider {
  readonly name: string;
  currentUser(args: { userId: string }): Promise<NexuraIdentity | null>;
  listOrganizations(args: { userId: string }): Promise<Array<{ id: string; name: string }>>;
}

/* ---------- Notifications ---------- */
export interface NexuraNotificationInput {
  hospitalId: string;
  userId?: string;
  roleKey?: string;
  title: string;
  body?: string;
  level: "info" | "success" | "warning" | "critical";
  category?: string;
  link?: string;
  patientId?: string;
}

export interface NotificationProvider {
  readonly name: string;
  push(input: NexuraNotificationInput): Promise<{ id: string }>;
  list(args: { userId: string; hospitalId: string; roleKeys: string[]; limit?: number }): Promise<NexuraNotificationInput[] & { readAt?: Date | null }[] | unknown[]>;
  markRead(args: { userId: string; hospitalId: string; roleKeys: string[]; ids?: string[]; all?: boolean }): Promise<number>;
}

/* ---------- Calendar ---------- */
export interface CalendarEvent {
  id: string;
  title: string;
  at: Date;
  kind: "appointment" | "shift" | "surgery" | "reminder";
  link?: string;
}

export interface CalendarProvider {
  readonly name: string;
  eventsFor(args: { hospitalId: string; userId?: string; from: Date; to: Date }): Promise<CalendarEvent[]>;
}

/* ---------- Tasks ---------- */
export interface TaskProvider {
  readonly name: string;
  countsFor(args: { hospitalId: string; userId?: string }): Promise<{ open: number; critical: number; overdue: number }>;
}

/* ---------- Messaging ---------- */
export interface MessagingProvider {
  readonly name: string;
  unreadFor(args: { hospitalId: string; userId: string }): Promise<number>;
}

/* ---------- Files ---------- */
export interface FileRef {
  id: string;
  name: string;
  mime: string;
  size: number;
  url?: string;
}

export interface FileStorageProvider {
  readonly name: string;
  put(args: { hospitalId: string; name: string; mime: string; size: number; data?: string; patientId?: string; ownerId: string; ownerName: string }): Promise<FileRef>;
  get(args: { id: string; hospitalId: string }): Promise<FileRef | null>;
}

/* ---------- Search ---------- */
export interface SearchHit {
  type: string;
  id: string;
  title: string;
  sub?: string;
  href: string;
}

export interface SearchProvider {
  readonly name: string;
  search(args: { hospitalId: string; userId: string; q: string; limit?: number }): Promise<SearchHit[]>;
}

/* ---------- Audit ---------- */
export interface AuditProvider {
  readonly name: string;
  record(args: {
    hospitalId: string;
    actorName: string;
    actorRole: string;
    action: string;
    entityType: string;
    entityId?: string;
    patientId?: string;
    detail?: Record<string, unknown>;
  }): Promise<void>;
}

/* ---------- Automation ---------- */
export interface AutomationProvider {
  readonly name: string;
  fire(args: {
    hospitalId: string;
    triggerType: string;
    actorName: string;
    actorRole: string;
    patientId?: string;
    patientName?: string;
    relatedId?: string;
    detail?: Record<string, unknown>;
  }): Promise<void>;
}

/* ---------- Feature flags ---------- */
export interface FeatureFlagProvider {
  readonly name: string;
  isEnabled(key: string, fallback?: boolean): Promise<boolean>;
  all(): Promise<Record<string, boolean>>;
}

/* ---------- Registry ---------- */
import { LocalAdapters } from "./local";

export interface NexuraProviders {
  identity: IdentityProvider;
  notifications: NotificationProvider;
  calendar: CalendarProvider;
  tasks: TaskProvider;
  messaging: MessagingProvider;
  files: FileStorageProvider;
  search: SearchProvider;
  audit: AuditProvider;
  automation: AutomationProvider;
  features: FeatureFlagProvider;
}

const g = globalThis as unknown as { __nexuraProviders?: NexuraProviders };

export function nexura(): NexuraProviders {
  if (g.__nexuraProviders) return g.__nexuraProviders;
  const mode = process.env.NEXURA_MODE === "remote" ? "remote" : "local";
  // Remote adapters are the production wiring point; per-provider fallback to local
  // happens inside each remote adapter when NEXURA_API_URL is absent (see docs).
  const providers: NexuraProviders = LocalAdapters();
  if (mode === "remote") {
    console.warn(JSON.stringify({ level: "warn", subsystem: "nexura", msg: "NEXURA_MODE=remote — remote adapters not yet wired; using local adapters (integration point)" }));
  }
  g.__nexuraProviders = providers;
  return providers;
}

export type { NxRole };
