/* backend-core-1 — live smoke test of the verified family-invite loop.
   Run: bun scripts/smoke-invite.mjs
   Exercises: portal demo login (2 users) → head invites an ONBOARDED
   user (invite path, token returned once) → member accepts from their
   own session → family listing shows the member → token reuse fails.
   Cleans up every row it creates. */
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const db = new PrismaClient();
const BASE = "http://127.0.0.1:3000";
const P1 = "+919900010001"; // head
const P2 = "+919900010002"; // invited member
const P3 = "+919900010003"; // third party (cookie minted locally)
const P4 = "+919900010004"; // second invitee (cookie minted locally)
let failures = 0;

function check(name, cond, detail = "") {
  if (cond) console.log(`  ok: ${name}`);
  else {
    failures++;
    console.log(`  FAIL: ${name} ${detail}`);
  }
}

/** Mint a portal session cookie locally (service-scope JWT, same
 *  construction as /api/portal/auth) — keeps the smoke fully
 *  independent of the OTP rate limit (5 sends / IP / 15 min). */
function cookieFor(portalUserId) {
  const token = jwt.sign({ sub: portalUserId, scope: "service" }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
  return `portal_session=${token}`;
}

async function main() {
  console.log("== pre-cleanup (idempotent runs) ==");
  await db.portalFamilyInvite.deleteMany({ where: { phone: { in: [P1, P2, P3, P4] } } });
  await db.portalUser.deleteMany({ where: { phone: { in: [P1, P2, P3, P4] } } });

  console.log("== setup: onboarded users + locally minted sessions ==");
  // Sessions are minted as service-scope JWTs (same construction as
  // /api/portal/auth) so the smoke never burns the OTP rate budget.
  const head = await db.portalUser.create({
    data: { phone: P1, fullName: "Smoke Head", isOnboarded: true },
  });
  const A = { cookie: cookieFor(head.id) };
  const memberBefore = await db.portalUser.create({
    data: { phone: P2, fullName: "Smoke Member", isOnboarded: true },
  });
  const B = { cookie: cookieFor(memberBefore.id) };
  check("head session cookie", Boolean(A.cookie));
  check("member session cookie", Boolean(B.cookie));

  console.log("== head invites onboarded user (invite path) ==");
  const inv = await fetch(`${BASE}/api/portal/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: A.cookie },
    body: JSON.stringify({ fullName: "Smoke Member", phone: P2, relation: "spouse" }),
  });
  const invBody = await inv.json();
  check("invite created (not silent attach)", invBody?.invite?.token != null, JSON.stringify(invBody).slice(0, 200));
  check("member NOT attached by invite alone", (await db.portalUser.findUnique({ where: { phone: P2 } })).familyHeadId !== head.id);

  console.log("== accept from the member's own session ==");
  const acc = await fetch(`${BASE}/api/portal/family/invite/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: B.cookie },
    body: JSON.stringify({ token: invBody.invite.token }),
  });
  const accBody = await acc.json();
  check("accept ok", accBody?.ok === true, JSON.stringify(accBody).slice(0, 200));
  check("member linked to head", accBody?.member?.familyHeadId === head.id);

  console.log("== token reuse rejected ==");
  const reuse = await fetch(`${BASE}/api/portal/family/invite/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: B.cookie },
    body: JSON.stringify({ token: invBody.invite.token }),
  });
  check("reuse fails", reuse.status >= 400);

  console.log("== family listing shows member ==");
  const fam = await fetch(`${BASE}/api/portal/family`, { headers: { cookie: A.cookie } });
  const famBody = await fam.json();
  check("member visible to head", Array.isArray(famBody?.members) && famBody.members.some((m) => m.phone === P2));

  console.log("== wrong phone cannot accept someone else's invite ==");
  // Fresh invite to a NEW onboarded user (D); a third party (C) tries to steal it.
  const d = await db.portalUser.upsert({
    where: { phone: P4 },
    update: { isOnboarded: true, familyHeadId: null },
    create: { phone: P4, fullName: "Smoke Fourth", isOnboarded: true },
  });
  const inv2 = await fetch(`${BASE}/api/portal/family`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: A.cookie },
    body: JSON.stringify({ fullName: "Smoke Fourth", phone: P4, relation: "sibling" }),
  });
  const inv2Body = await inv2.json();
  const c = await db.portalUser.upsert({
    where: { phone: P3 },
    update: { isOnboarded: true },
    create: { phone: P3, fullName: "Smoke Third", isOnboarded: true },
  });
  const wrong = await fetch(`${BASE}/api/portal/family/invite/accept`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookieFor(c.id) },
    body: JSON.stringify({ token: inv2Body.invite.token }),
  });
  check("mismatched phone rejected", wrong.status === 403);

  console.log("== cleanup ==");
  await db.portalFamilyInvite.deleteMany({ where: { headId: head.id } });
  await db.portalUser.deleteMany({ where: { phone: { in: [P1, P2, P3, P4] } } });
  console.log(failures === 0 ? "INVITE SMOKE: ALL PASS" : `INVITE SMOKE: ${failures} FAILURES`);
  process.exit(failures === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error("smoke crashed:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
