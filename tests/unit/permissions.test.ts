import { describe, it, expect } from "vitest";
import { ROLE_PERMISSIONS, PERMISSIONS, modulesForRole, roleKeysForUser, type NxRole } from "@/lib/nx/session";

/* RBAC-as-data invariants — the permission matrix is the security core. */

describe("permission matrix", () => {
  it("every role has a defined permission set", () => {
    for (const key of Object.keys(ROLE_PERMISSIONS)) {
      expect(Array.isArray(ROLE_PERMISSIONS[key as NxRole])).toBe(true);
    }
  });

  it("every role permission is a known permission key", () => {
    for (const [, perms] of Object.entries(ROLE_PERMISSIONS)) {
      for (const p of perms) {
        expect(PERMISSIONS).toContain(p);
      }
    }
  });

  it("super_admin has every permission", () => {
    expect(new Set(ROLE_PERMISSIONS.super_admin).size).toBe(PERMISSIONS.length);
  });

  it("least privilege: patient role cannot manage users or sign notes", () => {
    const p = ROLE_PERMISSIONS.patient;
    expect(p).not.toContain("users.manage");
    expect(p).not.toContain("note.sign");
    expect(p).not.toContain("billing.manage");
  });

  it("least privilege: nurse cannot manage users or billing", () => {
    const p = ROLE_PERMISSIONS.nurse;
    expect(p).not.toContain("users.manage");
    expect(p).not.toContain("billing.manage");
    expect(p).toContain("medication.administer");
  });

  it("auditor is read-only (no clinical writes)", () => {
    const p = ROLE_PERMISSIONS.auditor;
    expect(p).toContain("audit.view");
    expect(p).not.toContain("note.edit");
    expect(p).not.toContain("note.sign");
    expect(p).not.toContain("beds.manage");
  });

  it("financial permissions are separated from clinical roles", () => {
    expect(ROLE_PERMISSIONS.lab_tech).not.toContain("billing.view");
    expect(ROLE_PERMISSIONS.nurse).not.toContain("billing.manage");
    expect(ROLE_PERMISSIONS.billing_officer).not.toContain("note.edit");
    expect(ROLE_PERMISSIONS.billing_officer).toContain("billing.manage");
  });

  it("break-glass invocation is limited to clinical/administrative roles", () => {
    const canInvoke = (Object.keys(ROLE_PERMISSIONS) as NxRole[]).filter((r) => ROLE_PERMISSIONS[r].includes("breakglass.invoke"));
    expect(canInvoke).toContain("doctor");
    expect(canInvoke).toContain("nurse");
    expect(canInvoke).not.toContain("auditor");
    expect(canInvoke).not.toContain("patient");
  });
});

describe("module gates derived from matrix", () => {
  it("doctor lands on clinical modules", () => {
    const mods = modulesForRole("doctor");
    expect(mods).toContain("doctor");
    expect(mods).toContain("patients");
    expect(mods).toContain("labs");
  });

  it("auditor sees read-only surfaces only (no clinical write modules)", () => {
    const mods = modulesForRole("auditor");
    expect(mods).toContain("audit");
    expect(mods).toContain("analytics");
    expect(mods).not.toContain("doctor");
    expect(mods).not.toContain("nurse");
    expect(mods).not.toContain("tasks");
    expect(mods).not.toContain("beds");
  });

  it("patient role gets no staff modules", () => {
    const mods = modulesForRole("patient");
    expect(mods).not.toContain("admin");
    expect(mods).not.toContain("staff");
  });
});

describe("legacy role mapping", () => {
  it("maps legacy keys to canonical roles", () => {
    expect(roleKeysForUser("lab")).toContain("lab_tech");
    expect(roleKeysForUser("reception")).toContain("receptionist");
    expect(roleKeysForUser("leadership")).toContain("leadership");
    expect(roleKeysForUser("admin")).toContain("hospital_admin");
  });

  it("keeps canonical keys as-is", () => {
    expect(roleKeysForUser("doctor")).toContain("doctor");
  });

  it("unknown roles map to empty set without throwing", () => {
    expect(roleKeysForUser("alien")).toEqual([]);
  });
});
