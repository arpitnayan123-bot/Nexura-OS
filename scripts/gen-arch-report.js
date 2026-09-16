/* ============================================================
 * Nexura OS — 20-Phase Architecture Hardening Report (.docx)
 * Cover: Recipe R1 (Pure Paragraph Left) + MC-1 Medical Blue
 * Structure: Cover / TOC (Roman) / Body 13 chapters (Arabic)
 * ============================================================ */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, PageNumber, NumberFormat, AlignmentType, HeadingLevel,
  WidthType, BorderStyle, ShadingType, SectionType, TableOfContents,
  PageBreak, TableLayoutType,
} = require("docx");
const fs = require("fs");

/* ---------------- Palette: MC-1 Medical Blue ---------------- */
const PAL = {
  bg: "F5F8FC", primary: "1A5276", accent: "2E86C1",
  cover: { titleColor: "1A5276", subtitleColor: "606060", metaColor: "707070", footerColor: "A0A0A0" },
  table: { headerBg: "2E86C1", headerText: "FFFFFF", accentLine: "1A5276", innerLine: "D0DDE8", surface: "EDF3F8" },
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: NB, bottom: NB, left: NB, right: NB };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

/* ---------------- Cover layout math (design-system) ---------------- */
function splitTitleLines(title, charsPerLine) {
  if (title.length <= charsPerLine) return [title];
  const breakAfter = new Set([..."\uFF0C\u3002\u3001\uFF1B\uFF1A\uFF01\uFF1F", ..."-_\u2014\u2013\u00B7/", ..." \t"]);
  const lines = [];
  let remaining = title;
  while (remaining.length > charsPerLine) {
    let breakAt = -1;
    for (let i = charsPerLine; i >= Math.floor(charsPerLine * 0.6); i--) {
      if (i < remaining.length && breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
    }
    if (breakAt === -1) {
      const limit = Math.min(remaining.length, Math.ceil(charsPerLine * 1.3));
      for (let i = charsPerLine + 1; i < limit; i++) {
        if (breakAfter.has(remaining[i - 1])) { breakAt = i; break; }
      }
    }
    if (breakAt === -1) breakAt = charsPerLine;
    lines.push(remaining.slice(0, breakAt).trim());
    remaining = remaining.slice(breakAt).trim();
  }
  if (remaining) lines.push(remaining);
  if (lines.length > 1 && lines[lines.length - 1].length <= 2) {
    const last = lines.pop();
    lines[lines.length - 1] += last;
  }
  return lines;
}
function calcTitleLayout(title, maxWidthTwips, preferredPt = 40, minPt = 24) {
  const charWidth = (pt) => pt * 11; // English chars ~ 0.55em
  const charsPerLine = (pt) => Math.floor(maxWidthTwips / charWidth(pt));
  let titlePt = preferredPt, lines;
  while (titlePt >= minPt) {
    const cpl = charsPerLine(titlePt);
    if (cpl < 2) { titlePt -= 2; continue; }
    lines = splitTitleLines(title, cpl);
    if (lines.length <= 3) break;
    titlePt -= 2;
  }
  if (!lines || lines.length > 3) { lines = splitTitleLines(title, charsPerLine(minPt)); titlePt = minPt; }
  return { titlePt, titleLines: lines };
}
function calcCoverSpacing(params) {
  const { titleLineCount = 1, titlePt = 36, hasSubtitle = false, hasEnglishLabel = false,
    metaLineCount = 0, fixedHeight = 800, pageHeight = 16838, marginTop = 0, marginBottom = 0 } = params;
  const SAFETY = 1200;
  const usableHeight = pageHeight - marginTop - marginBottom - SAFETY;
  const titleHeight = titleLineCount * (titlePt * 23 + 200);
  const subtitleHeight = hasSubtitle ? (12 * 23 + 600) : 0;
  const englishLabelHeight = hasEnglishLabel ? (9 * 23 + 600) : 0;
  const metaHeight = metaLineCount * (10 * 23 + 100);
  const implicitParaHeight = 3 * 300;
  const contentHeight = titleHeight + subtitleHeight + englishLabelHeight + metaHeight + fixedHeight + implicitParaHeight;
  const remainingSpace = usableHeight - contentHeight;
  const safeRemaining = Math.max(remainingSpace, 400);
  const FOOTER_MIN = 800;
  const rawTop = Math.floor(safeRemaining * 0.45);
  const rawBottom = Math.floor(safeRemaining * 0.45);
  const bottomSpacing = Math.max(rawBottom, FOOTER_MIN);
  const topSpacing = Math.max(rawTop - Math.max(0, FOOTER_MIN - rawBottom), 400);
  const midSpacing = Math.max(safeRemaining - topSpacing - bottomSpacing, 0);
  return { topSpacing, midSpacing, bottomSpacing };
}

/* ---------------- Recipe R1 cover ---------------- */
function buildCoverR1(config) {
  const P = config.palette;
  const padL = 1200, padR = 800;
  const availableWidth = 11906 - padL - padR - 300;
  const { titlePt, titleLines } = calcTitleLayout(config.title, availableWidth, 40, 24);
  const titleSize = titlePt * 2;
  const spacing = calcCoverSpacing({
    titleLineCount: titleLines.length, titlePt,
    hasSubtitle: !!config.subtitle, hasEnglishLabel: !!config.englishLabel,
    metaLineCount: (config.metaLines || []).length, fixedHeight: 400,
  });
  const accentLeft = { style: BorderStyle.SINGLE, size: 8, color: P.accent, space: 12 };
  const children = [];
  children.push(new Paragraph({ spacing: { before: spacing.topSpacing } }));
  if (config.englishLabel) {
    children.push(new Paragraph({
      indent: { left: padL, right: padR }, spacing: { after: 500 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 8 } },
      children: [new TextRun({ text: config.englishLabel.split("").join("  "),
        size: 18, color: P.accent, font: { ascii: "Calibri", eastAsia: "SimHei" }, characterSpacing: 40 })],
    }));
  }
  for (let i = 0; i < titleLines.length; i++) {
    children.push(new Paragraph({
      indent: { left: padL },
      spacing: { after: i < titleLines.length - 1 ? 100 : 300, line: Math.ceil(titlePt * 23), lineRule: "atLeast" },
      children: [new TextRun({ text: titleLines[i], size: titleSize, bold: true,
        color: P.cover.titleColor, font: { eastAsia: "SimHei", ascii: "Times New Roman" } })],
    }));
  }
  if (config.subtitle) {
    children.push(new Paragraph({
      indent: { left: padL }, spacing: { after: 800 },
      children: [new TextRun({ text: config.subtitle, size: 24, color: P.cover.subtitleColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Times New Roman" } })],
    }));
  }
  for (const line of (config.metaLines || [])) {
    children.push(new Paragraph({
      indent: { left: padL + 200 }, spacing: { after: 80 },
      border: { left: accentLeft },
      children: [new TextRun({ text: line, size: 24, color: P.cover.metaColor,
        font: { eastAsia: "Microsoft YaHei", ascii: "Times New Roman" } })],
    }));
  }
  children.push(new Paragraph({ spacing: { before: spacing.bottomSpacing } }));
  children.push(new Paragraph({
    indent: { left: padL, right: padR },
    border: { top: { style: BorderStyle.SINGLE, size: 2, color: P.accent, space: 8 } },
    spacing: { before: 200 },
    children: [
      new TextRun({ text: config.footerLeft || "", size: 16, color: P.cover.footerColor, font: { ascii: "Times New Roman" } }),
      new TextRun({ text: "                                        " }),
      new TextRun({ text: config.footerRight || "", size: 16, color: P.cover.footerColor, font: { ascii: "Times New Roman" } }),
    ],
  }));
  return [new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: P.bg }, borders: noBorders,
        children,
      })],
    })],
  })];
}

/* ---------------- Body builders (Profile A, English) ---------------- */
const EN_FONT = { ascii: "Times New Roman", eastAsia: "SimSun" };
const HD_FONT = { ascii: "Times New Roman", eastAsia: "SimHei" };

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 160, line: 312 },
    children: [new TextRun({ text, bold: true, size: 32, color: PAL.primary, font: HD_FONT })],
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120, line: 312 },
    children: [new TextRun({ text, bold: true, size: 28, color: PAL.primary, font: HD_FONT })],
  });
}
function body(runsOrText, opts = {}) {
  const runs = typeof runsOrText === "string"
    ? [new TextRun({ text: runsOrText, size: 24, color: "000000", font: EN_FONT })]
    : runsOrText;
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    spacing: { line: 312, after: 120, ...(opts.spacing || {}) },
    children: runs,
  });
}
function t(text, extra = {}) { return new TextRun({ text, size: 24, color: "000000", font: EN_FONT, ...extra }); }
function b(text) { return t(text, { bold: true }); }
function code(text) { return t(text, { font: { ascii: "Courier New", eastAsia: "SimSun" }, size: 22, color: "1A5276" }); }

function tableTitle(text) {
  return new Paragraph({
    keepNext: true, spacing: { before: 160, after: 80 },
    children: [new TextRun({ text, bold: true, size: 21, color: PAL.primary, font: EN_FONT })],
  });
}
function dataTable(headers, rows, widths) {
  const mk = (text, isHeader, w) => new TableCell({
    children: [new Paragraph({
      spacing: { line: 276 },
      children: [new TextRun({
        text: String(text), size: 20, bold: isHeader,
        color: isHeader ? PAL.table.headerText : "000000", font: EN_FONT,
      })],
    })],
    shading: { type: ShadingType.CLEAR, fill: isHeader ? PAL.table.headerBg : "FFFFFF" },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    width: { size: w, type: WidthType.PERCENTAGE },
  });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: PAL.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: PAL.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: PAL.table.innerLine },
      insideVertical: { style: BorderStyle.SINGLE, size: 1, color: PAL.table.innerLine },
    },
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: headers.map((h, i) => mk(h, true, widths[i])) }),
      ...rows.map((r, ri) => new TableRow({
        cantSplit: true,
        children: r.map((c, i) => {
          const cell = mk(c, false, widths[i]);
          return ri % 2 === 1 ? new TableCell({
            children: [new Paragraph({ spacing: { line: 276 },
              children: [new TextRun({ text: String(c), size: 20, color: "000000", font: EN_FONT })] })],
            shading: { type: ShadingType.CLEAR, fill: PAL.table.surface },
            margins: { top: 60, bottom: 60, left: 120, right: 120 },
            width: { size: widths[i], type: WidthType.PERCENTAGE },
          }) : cell;
        }),
      })),
    ],
  });
}

/* ============================================================
 * CONTENT
 * ============================================================ */
const content = [];

/* ---------- Executive Summary ---------- */
content.push(h1("Executive Summary"));
content.push(body([
  t("This report documents the full 20-phase Principal Architect audit and refactor program executed against the Nexura OS codebase, a healthcare operations platform built on Next.js 16, TypeScript, Prisma and PostgreSQL. The program covered all 38 audit domains defined in the mandate, from authentication and tenant isolation through transaction safety, API standardization, AI governance, demo-data separation, deployment architecture, testing and documentation. Its guiding constraint was preserved throughout: "),
  b("refactor, never rebuild"),
  t(", keeping every product surface (hospital console, clinic, pharmacy, patient portal, connect B2B distribution, know-your-health) functionally and visually intact."),
]));
content.push(body([
  t("The hardening arc spans "),
  b("245 changed files, +12,488 / -7,790 lines"),
  t(" across the prior infrastructure passes (repo hygiene, PostgreSQL migration, stateless topology, environment configuration, test coverage) and the architecture pass itself (arch-security-1, arch-transactions-1, arch-api-consistency-1, arch-ai-1, arch-demo-1, arch-tests-1, arch-docs-1). Every change was verified by the full engineering gate: "),
  b("prisma validate OK, TypeScript strict 0 errors, ESLint 0 errors, 280/280 unit tests in 22 files, 46/46 API smoke checks, and a serve-side verified production deploy"),
  t(" (DEPLOY VERIFIED on the guardian-managed :3000 runtime). A real-browser end-to-end pass confirmed the homepage, hospital Command Center, pharmacy billing and inventory, and clinic booking behave exactly as before."),
]));
content.push(body([
  t("A final recheck was performed on 2026-09-16 after a sandbox platform reset wiped the loopback datastores and the untracked environment files. The rootless PostgreSQL 17.11 and Redis 8.0.2 daemons were reinstalled from the documented procedure ("),
  code("scripts/install-datastores.sh"),
  t("), all three migrations and the full seed chain were reapplied, and every gate was re-run fresh and passed. This event validated the recovery tooling built during the hardening pass and is documented in Section 7. Sections 1 through 8 present findings; Sections 9 through 13 present the executed work, the files touched, the files deliberately kept, the remaining risks stated honestly, and the recommended next steps."),
]));

/* ---------- 1. Current Architecture ---------- */
content.push(h1("1. Current Architecture"));
content.push(body([
  t("Nexura OS is a "),
  b("modular monolith"),
  t(": one Next.js 16 application containing roughly 562 source files and 187 API routes, with clean internal layering instead of microservices. The canonical request path is "),
  code("route handler \u2192 validation (zod) \u2192 authorization \u2192 service \u2192 repository (Prisma) \u2192 PostgreSQL"),
  t(". Route handlers are thin: they parse input, delegate to services under "),
  code("src/lib/nx/*"),
  t(" and "),
  code("src/modules/*"),
  t(", and return a response envelope. The canonical route wrapper "),
  code("withRoute"),
  t(" in "),
  code("src/lib/nx/api.ts"),
  t(" (line 45) attaches a request ID, one structured latency-and-status log line, the default per-IP rate limit, and a safe JSON "),
  code("fail(\"internal\", 500)"),
  t(" conversion for uncaught exceptions."),
]));
content.push(body([
  t("Authorization is centralized in "),
  code("src/lib/nx/api.ts"),
  t(" ("),
  code("guard()"),
  t(", "),
  code("requireHospitalContext"),
  t(", "),
  code("aiGate"),
  t(", "),
  code("withProductAuth"),
  t(") and "),
  code("src/lib/nx/session.ts"),
  t(", which owns the permission vocabulary including role exclusions. Session verification lives in "),
  code("src/lib/auth/jwt.ts"),
  t(", which throws in production rather than falling back to an insecure secret, and whose "),
  code("verifyToken"),
  t(" rejects refresh and service token families on user-facing routes. Cross-cutting state is split honestly between PostgreSQL (system of record: "),
  code("NxJob"),
  t(", "),
  code("NxAuditEvent"),
  t(", sessions, all domain tables), Redis (ephemeral: rate-limit windows "),
  code("nx:rl:*"),
  t(", SSE event fan-out "),
  code("nx:bus"),
  t(", sync leases "),
  code("nx:lock:*"),
  t("), and per-process socket maps in "),
  code("src/lib/nx/bus.ts"),
  t(". The full map, including the stated exceptions, is documented in "),
  code("docs/ARCHITECTURE.md"),
  t("."),
]));
content.push(body([
  t("The data layer is PostgreSQL 17 only ("),
  code("prisma/schema.prisma"),
  t(" provider "),
  code("postgresql"),
  t("; SQLite retired from the runtime path) with 160 tables in the baseline migration and two follow-up migrations. The AI surface is a single client, "),
  code("src/lib/openrouter.ts"),
  t(", exporting "),
  code("runText"),
  t(", "),
  code("runVision"),
  t(", "),
  code("runChatText"),
  t(" and "),
  code("runTextRaw"),
  t(" with an OpenRouter-to-z-ai fallback chain and a 45-second timeout bound. Background work runs on the database-backed "),
  code("NxJob"),
  t(" runner ("),
  code("src/lib/nx/jobs/runner.ts"),
  t(") using "),
  code("FOR UPDATE SKIP LOCKED"),
  t(" claims plus a stale-claim reaper, so any instance can run the worker loop safely. Six product faces plus vitals, emergency and predictive modules are served from one deployment."),
]));

/* ---------- 2. Major Problems Identified ---------- */
content.push(h1("2. Major Problems Identified (Pre-Refactor)"));
content.push(body([
  t("The audit found the codebase functional but carrying prototyping-era debt concentrated in four areas: cross-tenant data access, transaction and concurrency safety, error hygiene, and AI plumbing honesty. The most severe findings, each fixed and verified during the pass, were the following."),
]));
content.push(body([
  b("Tenant isolation. "),
  t("Twenty-three cross-hospital "),
  code("findFirst"),
  t(" fallbacks (the pattern "),
  code("db.X.findFirst({ where: { id } })"),
  t(" after a hospital-scoped miss) let any authenticated hospital user fall through to another hospital's row. The legacy "),
  code("src/app/api/auth/route.ts"),
  t(" exposed a second, unmanaged login path issuing tokens that could not be revoked and that "),
  code("verifyToken"),
  t(" did not distinguish from session families."),
]));
content.push(body([
  b("Money and inventory integrity. "),
  t("The pharmacy sale path decremented stock and created invoices in separate steps with no transaction: two concurrent buyers could both pass a stale stock check and drive inventory negative, and a failed invoice insert stranded the sale. Invoice-number allocation raced under concurrency. Idempotency used check-then-create, so two simultaneous same-key requests could both execute and double-charge. The MAR (medication administration record) path had no compare-and-set, allowing a controlled dose to be administered twice by concurrent taps."),
]));
content.push(body([
  b("Error and response hygiene. "),
  t("Sixty-seven route handlers returned "),
  code("err.message"),
  t(" (or equivalent) directly to clients, leaking Prisma and SDK internals such as connection strings and schema detail. Sixty-four legacy handlers had no wrapper at all, so uncaught exceptions surfaced as Next.js HTML 500 pages with no request ID and no log line, and no default rate limit applied."),
]));
content.push(body([
  b("AI plumbing. "),
  t("A 494-line "),
  code("src/lib/ai/gateway.ts"),
  t(" scaffold claimed, in its header comment, to be the mandatory AI abstraction, while six live routes imported "),
  code("z-ai-web-dev-sdk"),
  t(" directly, bypassing the real canonical client. The prescription camera reported a fabricated "),
  code("Math.random()"),
  t(" confidence value; telemetry reported a hardcoded "),
  code("MODEL_VERSION"),
  t(" label rather than the actual provider path; a hardcoded \"35-year-old Indian male\" persona sat inside lab interpretation; and AI consent checks existed but were not enforced in production."),
]));

/* ---------- 3. Security Findings ---------- */
content.push(h1("3. Security Findings"));
content.push(h2("3.1 Authentication and session"));
content.push(body([
  t("The unmanaged login path was deleted ("),
  code("src/app/api/auth/route.ts"),
  t(" and a dead "),
  code("src/lib/auth/middleware.ts"),
  t(", both with zero frontend callers verified by repo-wide search), leaving one canonical session flow per product type. "),
  code("verifyToken"),
  t(" in "),
  code("src/lib/auth/jwt.ts"),
  t(" now rejects refresh and service token families when presented to user-facing routes, closing a privilege-confusion window. The MFA-disable flow requires a second factor, and the step-up verification flow gained an attempt cap. The DIY guest cookie is issued "),
  code("secure"),
  t(" under "),
  code("NODE_ENV=production"),
  t(". JWT secret handling was already correct (throw, never fallback) and is regression-locked."),
]));
content.push(h2("3.2 Authorization and tenant isolation"));
content.push(body([
  t("All 23 cross-tenant fallback sites now flow through "),
  code("requireHospitalContext"),
  t(" in "),
  code("src/lib/nx/api.ts"),
  t(", which fails closed: no hospital claim means a documented DEMO_MODE-only fallback, never a cross-hospital read. The "),
  code("guard()"),
  t(" context enforcement is real, not advisory: "),
  code("patientInScope"),
  t(", patient self-scope, and department matching are applied, so a role grants capability only inside its scope (authentication is not authorization; roles do not bypass resource scoping). Sixteen IDOR and boundary fixes landed across the surface: supply PATCH scoping, ABAC policy update, wearable pairing, predict protocols and radar, search patient self-scope, offline-sync write permissions, connect party checks, telemedicine clinic scoping (which exposed a missing "),
  code("TelemedicineConsult"),
  t(" model that would have 500'd every call \u2014 fixed with migration "),
  code("20260917000000_add_telemedicine_consults"),
  t("), the notes 404-oracle, blood-booking status allowlist, and others."),
]));
content.push(h2("3.3 Input, transport and demo boundaries"));
content.push(body([
  t("The withRoute rate limiter keys on "),
  code("ipOf()"),
  t(" ("),
  code("src/lib/nx/api.ts", { }),
  t(", line 305), which reads the rightmost X-Forwarded-For entry, closing the spoofable leftmost-entry key. Webhook routes verify HMAC signatures ("),
  code("NX_INBOUND_WEBHOOK_SECRET"),
  t("); the HL7 inbound route rejects unsigned payloads (smoke-verified). Demo boundaries are explicit: the synthetic ABDM/ABHA identity lookup returns 501 outside "),
  code("DEMO_MODE"),
  t("; all 16 demo seed scripts refuse to run under "),
  code("NODE_ENV=production"),
  t(" unless "),
  code("SEED_DEMO_OVERRIDE=true"),
  t(" is passed (runtime-tested both ways); demo credentials are no longer advertised on client-facing error surfaces. Security headers ship in a documented, deliberately permissive posture for the sandboxed preview iframe, with tightening notes inline in "),
  code("src/proxy.ts"),
  t(" \u2014 the pass did not weaken them for convenience, per the mandate."),
]));

/* ---------- 4. Database Findings ---------- */
content.push(h1("4. Database Findings"));
content.push(body([
  t("The runtime datastore is PostgreSQL 17 with three migrations: "),
  code("20260916000000_baseline"),
  t(" (160 tables), "),
  code("20260917000000_add_telemedicine_consults"),
  t(", and "),
  code("20260918000000_integrity_indexes_batch_identity"),
  t(". The integrity migration repaired real structural debt: "),
  code("ProductBatch"),
  t(" gained an identity unique constraint (existing duplicate rows were deduplicated with stock folded into the surviving batch before the constraint was applied; all repair SQL was rehearsed on a scratch database first and the live data ended byte-identical); 30 foreign-key indexes were added to stop sequential scans on every join path; "),
  code("NxEventLog"),
  t(" gained a "),
  code("(hospital, aggregate, seq)"),
  t(" unique constraint with resequencing; the "),
  code("NxAuditEvent"),
  t(", "),
  code("NxEventLog"),
  t(" and "),
  code("NxTimestampBlock"),
  t(" chains reference "),
  code("Hospital"),
  t(" with "),
  code("onDelete: Restrict"),
  t(" so audit history can never cascade-delete; and a partial unique index on "),
  code("HospitalAppointment (doctorId, date) WHERE status = 'active'"),
  t(" backs the booking-race fix at the database level, not just in application code."),
]));
content.push(body([
  t("Schema conventions are documented and honest: monetary values in the Nx layer are integer paise (never floats); legacy pharmacy and clinic tables still hold Float rupees, an accepted, documented debt with a written migration path ("),
  code("docs/ARCHITECTURE.md"),
  t(" \u00A75) \u2014 see Section 12. JSON-shaped fields are stored as String columns by design for portability, with jsonb promotion recorded as a deliberate future decision. All 27 user-facing "),
  code("contains"),
  t(" filters carry "),
  code("mode: \"insensitive\""),
  t(" to preserve SQLite-era search behavior on Postgres. Operations tooling is live-tested: "),
  code("scripts/db-backup.mjs"),
  t(" (pg_dump -Fc rotation) and "),
  code("scripts/db-restore-validate.mjs"),
  t(" (restore into a scratch database with row-count parity against live)."),
]));

/* ---------- 5. AI Architecture Findings ---------- */
content.push(h1("5. AI Architecture Findings"));
content.push(body([
  t("The canonical AI client is "),
  code("src/lib/openrouter.ts"),
  t(". The dead 494-line "),
  code("src/lib/ai/gateway.ts"),
  t(" scaffold \u2014 zero importers, misleading \"must use this gateway\" header \u2014 was deleted rather than populated, per the anti-over-engineering mandate. All six routes that imported the SDK directly were rewired onto the canonical client: assistant (multi-turn via the new "),
  code("runChatText"),
  t("), pharmacy ai-query ("),
  code("runTextRaw"),
  t(" \u2014 a reasoned deviation, since the route returns prose and JSON parsing would break it), prescription OCR ("),
  code("runVision"),
  t(", with magic-byte MIME sniffing preserved exactly), voice-bill chat parsing ("),
  code("runText"),
  t("), clinic voice-SOAP ("),
  code("runText"),
  t(" with strict JSON), and portal ai-interpret ("),
  code("runTextRaw"),
  t(" for markdown). The one remaining direct SDK call is voice-bill's ASR, because only the z-ai SDK provides speech-to-text today; that capability gap is documented at the call site, not hidden."),
]));
content.push(body([
  t("Governance and honesty fixes: telemetry now reports "),
  code("activeModelId()"),
  t(" \u2014 the real provider path, environment-dependent \u2014 instead of a hardcoded version label (regression-locked in "),
  code("tests/unit/hardening.test.ts"),
  t("); AI consent is enforced, with "),
  code("patient_summary"),
  t(" and "),
  code("discharge_draft"),
  t(" returning 403 "),
  code("ai_consent_required"),
  t(" in production when "),
  code("NxConsent"),
  t(" is not granted (DEMO_MODE posture documented, blocked attempts logged); the fabricated "),
  code("Math.random()"),
  t(" confidence badge was replaced with a deterministic match score; and the hardcoded patient persona was removed from lab interpretation. The mandated distinction is maintained in documentation: model confidence is a schema-level signal, not clinical validation, and the presence of technical controls is never claimed as regulatory compliance. Stated honestly: token-usage and cost accounting do not exist in the telemetry yet."),
]));

/* ---------- 6. API and Backend Findings ---------- */
content.push(h1("6. API and Backend Findings"));
content.push(body([
  t("Sixty-four legacy route handlers across 39 files were wrapped in "),
  code("withRoute"),
  t(", giving the entire product API uniform request IDs, latency logs, safe JSON 500s, and the default rate limit \u2014 while preserving every successful and guarded-error response byte-identically. Three deliberate skips are documented with reasons: the SSE stream route (a long-lived response must not sit in a request-scoped wrapper), "),
  code("nx/system/errors"),
  t(" (already wrapped in its own "),
  code("withOk"),
  t(" style), and "),
  code("nx/bio/[deviceId]"),
  t(" (a pure re-export of an already-wrapped handler; double-wrapping would corrupt behavior). Sixty-seven client-facing "),
  code("err.message"),
  t(" leaks across 59 files were replaced with safe sentences plus structured "),
  code("log.error"),
  t(" calls, keeping error codes and HTTP statuses identical so frontends matching on codes are unaffected. Seven direct "),
  code("console.*"),
  t(" calls moved to the PHI-redacting structured logger, and eight silent catch blocks gained log visibility."),
]));
content.push(body([
  t("Transaction and concurrency hardening (the core of the pharmacy and billing findings) was applied where money, stock and medication safety live: pharmacy sale is a single "),
  code("$transaction"),
  t(" with conditional stock decrements (negative stock and lost sales are structurally impossible) plus invoice-number P2002 retry; purchases are transactional via batch-identity upsert with zod bounds closing unbounded discounts and garbage quantities; returns carry a sufficiency guard; MAR administration uses compare-and-set so a controlled dose cannot be double-administered; supply procurement stock uses CAS inside the transaction with 409 "),
  code("stock_conflict"),
  t(" on lost-update contention; billing v2 payment and bill-status recompute are atomic with caller-scoped idempotency; offline sync keys are caller-scoped; schedule booking closes its race with the partial unique index and maps P2002 to 409; clinic booking accept uses a claim-flip with rollback; bed lifecycle and reserve use compare-and-set; discharge makes admission plus bed-release atomic; and the "),
  code("NxJob"),
  t(" stale-claim reaper (10 minutes, no attempt penalty) keeps jobs crash-safe."),
]));

/* ---------- 7. Deployment Findings ---------- */
content.push(h1("7. Deployment Findings"));
content.push(body([
  t("Production configuration is Postgres plus Redis, enforced at boot: "),
  code("src/instrumentation.ts"),
  t(" calls "),
  code("assertProductionEnv()"),
  t(" ("),
  code("src/lib/env.ts"),
  t("), which refuses to start production without a postgres-scheme "),
  code("DATABASE_URL"),
  t(", a "),
  code("JWT_SECRET"),
  t(" of at least 16 characters, and a "),
  code("REDIS_URL"),
  t("; dev stays forgiving by design. The canonical deploy path is "),
  code("scripts/deploy-preview.sh"),
  t(" (env heal, datastore gate, build, serve-side verification), and the container path is "),
  code("Dockerfile"),
  t(" plus "),
  code("docker-compose.yml"),
  t(" with Postgres and Redis services and the "),
  code("scripts/pg-init/01-init.sql"),
  t(" bootstrap (pg_trgm for fuzzy patient search, pgcrypto for column hashing). CI ("),
  code(".github/workflows/ci.yml"),
  t(") runs prisma validate and generate, typecheck gated to "),
  code("src/"),
  t(", ESLint, the 280-test vitest suite, applies migrations against Postgres and Redis service containers, boots the app, and runs the API smoke suite plus a secret scan."),
]));
content.push(body([
  t("Background work needs no persistent worker runtime under the current scale: the "),
  code("NxJob"),
  t(" runner claims work through the database, so any number of instances can safely run the loop, and "),
  code("NEXURA_JOBS=0"),
  t(" documents how to disable the in-process runner on web/API runtimes if a split becomes necessary \u2014 the deployment architecture is written down rather than assumed. The sandbox runtime runs rootless PostgreSQL 17.11 and Redis 8.0.2 under "),
  code("~/pg-install"),
  t(" with "),
  code("~/pgdata"),
  t(" as the cluster; because the platform restart wipes untracked home-directory state, the pass hardened the procedure into "),
  code("scripts/install-datastores.sh"),
  t(" (install, initdb, start, create database) and "),
  code("scripts/ensure-datastores.sh"),
  t(" (loopback revival, no-op for managed hosts). The final recheck exercised exactly this path: after the 2026-09-16 platform reset, both daemons were restored, migrations and the seed chain reapplied, and the deploy re-verified end to end. The untracked "),
  code(".env.example"),
  t(" lost to the same reset was recreated from "),
  code("src/lib/env.ts"),
  t(" as the documented template."),
]));

/* ---------- 8. Testing Findings ---------- */
content.push(h1("8. Testing Findings"));
content.push(body([
  t("The suite is "),
  b("280 vitest tests across 22 files"),
  t(", all exercising real logic (the job-runner and idempotency tests run against a live PostgreSQL; "),
  code("tests/setup-env.ts"),
  t(" makes "),
  code(".env"),
  t(" the source of truth for test runs, defending against the process-env-beats-.env precedence trap discovered during the Postgres migration). The hardening pass added "),
  code("tests/unit/hardening.test.ts"),
  t(" with 12 regression tests targeting exactly the fixed defects, not a quota: rightmost-XFF IP keying, model-version honesty, "),
  code("requireHospitalContext"),
  t(" pass-through and documented demo fallback, "),
  code("withIdempotency"),
  t(" claim-then-execute semantics (sequential replay returns the stored response, key reuse with a different payload returns 409, concurrent same-key requests execute the handler exactly once under a deliberately widened race window, and different callers never share an idempotency scope), and the demo-seed production guard refusal."),
]));
content.push(body([
  t("Beyond unit coverage, "),
  code("tests/api-smoke.sh"),
  t(" runs 46 live checks against the deployed build (wired via "),
  code("package.json"),
  t(" "),
  code("test:api"),
  t(" and the CI smoke step), and the pass closed with a real-browser end-to-end verification of the homepage, the hospital console (Command Center and Work Queue live), pharmacy billing and inventory, and clinic booking with doctors and slots \u2014 zero page errors, confirming product behavior survived the infrastructure refactor. The priority areas mandated for protection \u2014 authn/authz, patient isolation, RBAC/ABAC, inventory, billing, prescriptions, critical alerts, AI governance, idempotency, rate limiting, validation and tenant isolation \u2014 are covered by a mix of unit, smoke and E2E layers; the largest remaining gap is a committed Playwright suite ("),
  code("playwright.config.ts"),
  t(" is wired but scenario coverage is thin), listed in Section 13."),
]));

/* ---------- 9. Refactor Executed ---------- */
content.push(h1("9. Refactor Executed"));
content.push(body([
  t("The program was executed as small, verifiable workstreams, each gated by typecheck, lint, tests and inspection before moving on \u2014 never a blanket rewrite. The workstreams below carry their git tags/commits; together they span "),
  b("245 files, +12,488 / -7,790 lines"),
  t(" since the pre-hardening baseline."),
]));
content.push(tableTitle("Table 1: Workstreams of the hardening arc"));
content.push(dataTable(
  ["Workstream", "Scope", "Primary surfaces"],
  [
    ["repo-hygiene-1", "Worklog archive, artifact untracking, single truthful status doc, verified dead-code removal", "docs/worklog-archive/, PRODUCTION_STATUS.md, mini-services/, examples/"],
    ["pg-migration-1 / pg-semantics-1", "SQLite to PostgreSQL 17 migration, rootless daemons, env-precedence defense, case-sensitivity parity, ops scripts", "prisma/schema.prisma, prisma/migrations/, src/lib/nx/db-dialect.ts, scripts/db-backup.mjs"],
    ["stateless-1 / env-config-1", "Redis-backed rate limiting and event bus, boot-time env gate, .env.example coverage", "src/lib/redis.ts, src/lib/env.ts, src/instrumentation.ts"],
    ["test-coverage-1", "Vitest suite expansion to 268 tests, CI wiring", "tests/unit/**, .github/workflows/ci.yml"],
    ["arch-security-1", "Fail-closed hospital context, guard ctx enforcement, legacy auth path deletion, 16 IDOR fixes, rightmost-XFF keying", "src/lib/nx/api.ts, src/lib/auth/jwt.ts, 20+ route files"],
    ["arch-transactions-1", "Transactional pharmacy/billing/MAR/supply/beds/discharge, claim-then-execute idempotency, integrity migration", "pharmacy/billing/clinic route files, src/lib/nx/api.ts, prisma/migrations/20260918000000"],
    ["arch-api-consistency-1", "67 error-leak fixes, 64 handlers wrapped in withRoute, structured logging", "59 route files, src/lib/nx/api.ts"],
    ["arch-ai-1", "Single AI client, dead gateway deletion, consent enforcement, telemetry honesty", "src/lib/openrouter.ts, 6 route files, tests/unit/hardening.test.ts"],
    ["arch-demo-1", "Seed production guards (16 scripts), ABDM 501 honesty, demo-credential truthing", "scripts/seed-*.ts, clinic/abha route, docs/DEMO_CREDENTIALS.md"],
    ["arch-tests-1 / arch-docs-1", "12 hardening regression tests; canonical architecture map and status doc", "tests/unit/hardening.test.ts, docs/ARCHITECTURE.md, PRODUCTION_STATUS.md"],
  ],
  [22, 44, 34],
));
content.push(body([
  t("Every workstream followed the mandated discipline: inspect before changing, identify dependencies, preserve working implementations, adopt the best existing abstraction as canonical, migrate callers, and verify. Where a brief could not be followed literally, the deviation was reasoned and documented (for example, pharmacy ai-query uses "),
  code("runTextRaw"),
  t(" instead of "),
  code("runText"),
  t(" because the route returns free-text prose)."),
]));
content.push(h2("9.1 Twenty-phase completion recheck"));
content.push(body([
  t("The mandate required a final recheck of the prompt itself. The matrix below maps each phase to its outcome; no phase was skipped and no deliverable was replaced with an unimplemented stub."),
]));
content.push(tableTitle("Table 2: 20-phase completion matrix"));
content.push(dataTable(
  ["Phase", "Outcome"],
  [
    ["1 Full audit (38 domains)", "Done - four parallel deep audits with file:line evidence; implementation treated as ground truth over docs"],
    ["2 Architecture map", "Done - docs/ARCHITECTURE.md is the canonical map incl. state topology and violations found"],
    ["3 Duplicates and dead code", "Done - dead gateway.ts (494 lines), legacy auth route, dead middleware deleted; A-G classification applied before deletions"],
    ["4 Canonical backend architecture", "Done - thin routes over validation/authorization/service/repository; existing good abstractions kept"],
    ["5 API standardization", "Done - withRoute envelope, request IDs, safe errors; no competing wrapper introduced"],
    ["6 Authn/authz centralization", "Done - requireHospitalContext fail-closed; guard ctx real; authn separated from authz"],
    ["7 Canonical rate limiting", "Done - ipOf rightmost-XFF keying; Redis distributed limiter authoritative; proxy edge bucket documented as burst guard"],
    ["8 Database engineering", "Done - integrity migration (batch identity, 30 FK indexes, audit RESTRICT, partial unique); legacy Float money documented as debt"],
    ["9 AI architecture", "Done - single openrouter client; direct SDK calls migrated; honesty rules enforced"],
    ["10 AI safety and clinical boundaries", "Done - confidence vs clinical validation distinguished; consent enforced; no compliance overclaim"],
    ["11 Demo/mock separation", "Done - seed guards, ABDM 501, honest labels, credential advertising removed"],
    ["12 Error handling", "Done - 67 leaks closed; safe client bodies; request IDs; PHI-redacting logs"],
    ["13 Transactions and concurrency", "Done - all inventory/billing/MAR/beds/booking write paths transactional or CAS; idempotency claim-then-execute"],
    ["14 Background jobs", "Done - DB-claimed runner multi-instance safe; stale-claim reaper; NEXURA_JOBS runtime split documented"],
    ["15 Security review", "Done - cookies, secrets, webhooks, IDOR, brute-force caps, session families; no preview-driven weakening"],
    ["16 Tests", "Done - 280 tests incl. 12 hardening regressions; smoke 46; E2E browser pass"],
    ["17 Code quality", "Done - strict TS, 0 errors, 0 lint; dead code removed; no ts-ignore shortcuts added"],
    ["18 Frontend preservation", "Done - zero UI redesign; browser E2E confirms routes, navigation, animation, design system intact"],
    ["19 Documentation rewrite", "Done - ARCHITECTURE.md, PRODUCTION_STATUS.md, DEMO_CREDENTIALS.md trued to reality with status categories"],
    ["20 No over-engineering", "Done - modular monolith preserved; no brokers, no extra databases, no speculative layers"],
  ],
  [30, 70],
));

/* ---------- 10. Files Changed ---------- */
content.push(h1("10. Files Changed"));
content.push(body([
  t("The complete per-commit detail lives in the git history (tags "),
  code("arch-security-1-final"),
  t(" and "),
  code("architecture-hardening-1-final"),
  t(" and the commits between them). The table groups the most important changed files by subsystem so a reviewer can walk the diff top-down."),
]));
content.push(tableTitle("Table 3: Key changed files by subsystem"));
content.push(dataTable(
  ["Subsystem", "Representative files", "Nature of change"],
  [
    ["Core API kernel", "src/lib/nx/api.ts", "requireHospitalContext, withRoute (withRoute<P> generics), ipOf rightmost-XFF, claim-then-execute withIdempotency, safe fail()"],
    ["Auth and session", "src/lib/auth/jwt.ts, src/lib/nx/session.ts, src/app/api/auth/route.ts (deleted), src/lib/auth/middleware.ts (deleted)", "Token-family rejection, permission vocabulary, unmanaged login path removed"],
    ["Pharmacy and billing", "src/app/api/pharmacy/** (billing, purchases, returns, voice-bill, ai-query, prescription-ocr), billing/v2", "Single-transaction sales, zod bounds, MAR CAS, idempotency scoping, canonical AI client"],
    ["Clinic, portal, connect, kyh", "src/app/api/clinic/**, portal/**, connect/**, kyh/**, appointments", "Error-leak fixes with codes preserved, scoping fixes, booking race closure, consent enforcement"],
    ["Nx console routes", "16 nx module routes + foresight + audit + workspace + diy (12 routes) + health + root + health-stats", "withRoute wrapping of 64 handlers, byte-identical responses"],
    ["AI client", "src/lib/openrouter.ts; src/lib/ai/gateway.ts (deleted)", "runChatText/runTextRaw exports, activeModelId(), capability-gap documentation"],
    ["Database", "prisma/migrations/20260917000000, 20260918000000; prisma/schema.prisma", "TelemedicineConsult model, batch identity, 30 FK indexes, audit RESTRICT, partial slot index"],
    ["Background jobs", "src/lib/nx/jobs/runner.ts", "Stale-claim reaper, FOR UPDATE SKIP LOCKED claims"],
    ["Seeds and docs", "16 scripts/seed-*.ts incl. legacy/; docs/ARCHITECTURE.md; PRODUCTION_STATUS.md; docs/DEMO_CREDENTIALS.md", "SEED_DEMO_OVERRIDE guards; canonical architecture map; truthful status; reset-claim fix"],
    ["Tests and CI", "tests/unit/hardening.test.ts; tests/setup-env.ts; .github/workflows/ci.yml", "12 regression tests; env precedence defense; gates wired"],
  ],
  [20, 42, 38],
));

/* ---------- 11. Files Deliberately Kept ---------- */
content.push(h1("11. Files Deliberately Kept"));
content.push(body([
  t("The mandate required preserving working code and collaborator-owned surfaces, and several files were explicitly left untouched for recorded reasons \u2014 keeping them is a decision, not an oversight."),
]));
content.push(tableTitle("Table 4: Deliberately preserved files and surfaces"));
content.push(dataTable(
  ["File / surface", "Why it was kept"],
  [
    ["src/app/api/portal/auth/route.ts (OTP flow)", "Collaborator-owned surface per the mandate; its per-process OTP store and limiter are queued behind the handoff, documented in PRODUCTION_STATUS.md state table"],
    ["Payment/billing-gateway integration", "Out of scope of the current milestone (collaborator surface); only read-only audit performed"],
    ["src/proxy.ts edge limiter + preview headers", "Edge runtime cannot reach Redis; it is a documented burst guard in front of the authoritative Redis limiter; permissive preview-iframe header posture kept with inline tightening notes"],
    ["src/lib/db.ts globalThis cache", "Prisma-recommended client cache; caches the client, never data"],
    ["src/app/api/nx/stream/route.ts (SSE)", "Long-lived stream must not sit in the request-scoped withRoute wrapper; bus fan-out already Redis-backed with HMAC re-verification"],
    ["src/app/api/nx/system/errors/route.ts", "Already wrapped in its own withOk style per the brief"],
    ["src/app/api/nx/bio/[deviceId]/route.ts", "Pure re-export of an already-wrapped handler; wrapping would double-wrap"],
    ["z-ai SDK ASR call in voice-bill", "Only available speech-to-text provider today; documented capability gap at the call site"],
    ["JSON-as-String columns", "Portable by design; jsonb promotion is a deliberate future decision, not an accident"],
    ["Legacy Float money columns (pharmacy/clinic)", "Non-breaking-change policy; integer-paise migration path written in ARCHITECTURE.md Section 5"],
    ["scripts/legacy/ seed scripts", "Still live members of the demo seeding chain referenced by seed-nx.ts/seed-nx-v4.ts"],
    ["Product UI/UX (Phase 18)", "No redesign permitted; UI touched only where a real engineering defect demanded it"],
  ],
  [36, 64],
));

/* ---------- 12. Remaining Risks ---------- */
content.push(h1("12. Remaining Risks"));
content.push(body([
  t("The following risks are known, visible and documented rather than hidden. None blocks the current milestone; each carries an owner-ready next step in Section 13."),
]));
content.push(tableTitle("Table 5: Known remaining risks"));
content.push(dataTable(
  ["Risk", "Impact", "Mitigation status"],
  [
    ["Legacy Float rupee money columns in pharmacy/clinic tables", "Rounding at large magnitudes; inconsistency with the integer-paise Nx layer", "Documented migration path in ARCHITECTURE.md Section 5; no runtime defect observed at current volumes"],
    ["withRoute default limiter is per-instance", "Burst absorption varies per isolate before the authoritative Redis limiter", "Distributed limiter remains authoritative for protected operations; per-instance layer is defense-in-depth"],
    ["Portal OTP limiter per-process; demo OTP 1234 in DEMO_MODE", "Second login surface not yet Redis-backed; demo affordance", "Collaborator-owned; excluded surface respected; confined to demo mode"],
    ["AI token-usage and cost accounting absent", "No per-request cost telemetry for the AI gateway", "Stated honestly in docs; openrouter client is the single integration point to add it"],
    ["Consent has no self-service granting UI", "AI consent is enforced but operationally granted", "Enforcement live (403 path tested); UI queued"],
    ["EMAIL_TRANSPORT=console", "Emails print to server log instead of sending", "Explicit integration point documented for SMTP/provider"],
    ["DB_READ_URL plumbed but not routed", "Read-replica benefit not realized", "Code documents the primary-routing behavior; wiring queued"],
    ["Permissive preview security headers", "Tightening required at production cutover", "Inline notes in src/proxy.ts; isolated from product behavior"],
    ["Technical controls are not compliance certification", "HIPAA/ABDM claims require process and audit beyond code", "Documentation never claims compliance from control presence (Phases 10 and 19 honesty rules)"],
    ["Sandbox datastores wiped by platform restarts", "Verification gates fail until datastores are restored", "install-datastores.sh + ensure-datastores.sh + .env documented; final recheck exercised the full path"],
  ],
  [32, 30, 38],
));

/* ---------- 13. Recommended Next Steps ---------- */
content.push(h1("13. Recommended Next Steps"));
content.push(body([
  t("The recommendations below are ordered by leverage and sequenced so none blocks another. Each names the surface to touch and the expected outcome, consistent with the anti-over-engineering mandate: small team, modular monolith, operations kept simple."),
]));
content.push(body([
  b("1. Complete the collaborator handoff (portal auth/OTP and payment gateway). "),
  t("When the collaborator surface lands, migrate the OTP store and limiter in "),
  code("src/app/api/portal/auth/route.ts"),
  t(" to Redis-backed semantics inside that same change, so the last per-process state leaves the request path. This is the only remaining item from the state-topology honest list without a written code path."),
]));
content.push(body([
  b("2. Execute the integer-paise money migration. "),
  t("Follow the written path in "),
  code("docs/ARCHITECTURE.md"),
  t(" Section 5: add integer-paise columns to the legacy pharmacy and clinic tables, backfill with a rehearsed conversion script, dual-write for one release, then switch reads. This closes the largest data-integrity debt that remains."),
]));
content.push(body([
  b("3. Add AI token-usage and cost telemetry. "),
  t("Extend "),
  code("src/lib/openrouter.ts"),
  t(" to capture usage fields from provider responses and emit them through the structured logger and AI telemetry record. Because every LLM call already flows through this one client, this is a contained change with immediate cost visibility."),
]));
content.push(body([
  b("4. Ship the consent self-service surface. "),
  t("Build the patient-facing grant/revoke UI on the existing "),
  code("NxConsent"),
  t(" model so AI consent stops being an operational step. The 403 enforcement path already exists and is tested; only the UI is missing."),
]));
content.push(body([
  b("5. Operational hardening at production cutover. "),
  t("Wire SMTP under "),
  code("EMAIL_TRANSPORT=smtp"),
  t(", route "),
  code("DB_READ_URL"),
  t(" to a real replica, tighten the preview security-header posture in "),
  code("src/proxy.ts"),
  t(", and move secrets from "),
  code(".env"),
  t(" into the platform secret manager. Each is a configuration-level change with documentation already in place."),
]));
content.push(body([
  b("6. Grow the committed E2E suite. "),
  t("Add Playwright scenarios for booking, pharmacy billing and portal login to "),
  code("playwright.config.ts"),
  t("-driven CI, prioritizing the critical flows verified manually during this pass so they become permanent regression guards. Keep the unit suite as the primary gate; E2E covers the seams."),
]));
content.push(body([
  b("7. Keep the datastore runbook first in ops memory. "),
  t("On any sandbox restart, run "),
  code("scripts/install-datastores.sh"),
  t(" (if "),
  code("~/pg-install"),
  t(" is gone) then "),
  code("scripts/ensure-datastores.sh"),
  t(", reapply "),
  code("npx prisma migrate deploy"),
  t(" and the seed chain, and confirm with the gate suite. The final recheck proved this path restores full green in minutes; DEPLOYMENT.md should carry it as the first recovery step."),
]));

/* ============================================================
 * ASSEMBLY
 * ============================================================ */
const pgSize = { width: 11906, height: 16838 };
const pgMargin = { top: 1440, bottom: 1440, left: 1701, right: 1417 };

function pageNumFooter() {
  return new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: EN_FONT })],
    })],
  });
}
function docHeader() {
  return new Header({
    children: [new Paragraph({
      alignment: AlignmentType.CENTER,
      border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: PAL.table.innerLine, space: 4 } },
      children: [new TextRun({ text: "Nexura OS \u2014 20-Phase Architecture Hardening Report", size: 18, color: "808080", font: EN_FONT })],
    })],
  });
}

const doc = new Document({
  creator: "Nexura Engineering",
  title: "Nexura OS - 20-Phase Architecture Hardening Report",
  styles: {
    default: {
      document: {
        run: { font: EN_FONT, size: 24, color: "000000" },
        paragraph: { spacing: { line: 312 } },
      },
      heading1: {
        run: { font: HD_FONT, size: 32, bold: true, color: PAL.primary },
        paragraph: { spacing: { before: 360, after: 160, line: 312 }, outlineLevel: 0 },
      },
      heading2: {
        run: { font: HD_FONT, size: 28, bold: true, color: PAL.primary },
        paragraph: { spacing: { before: 240, after: 120, line: 312 }, outlineLevel: 1 },
      },
      heading3: {
        run: { font: HD_FONT, size: 24, bold: true, color: PAL.primary },
        paragraph: { spacing: { before: 200, after: 100, line: 312 }, outlineLevel: 2 },
      },
    },
  },
  sections: [
    { // Section 1: Cover — margin 0, no footer
      properties: { page: { size: pgSize, margin: { top: 0, bottom: 0, left: 0, right: 0 } } },
      children: buildCoverR1({
        title: "Nexura OS 20-Phase Architecture Hardening Report",
        subtitle: "Full-repository audit, refactor and verification for professional engineering readiness",
        englishLabel: "ENGINEERING REPORT",
        metaLines: [
          "Scope: 20-phase Principal Architect program (P0-P10)",
          "Platform: Next.js 16 / TypeScript / Prisma / PostgreSQL 17 / Redis 8",
          "Verification: 280/280 tests - 46/46 smoke - DEPLOY VERIFIED",
          "Date: 2026-09-16",
        ],
        footerLeft: "Nexura OS Engineering",
        footerRight: "architecture-hardening-1-final",
        palette: PAL,
      }),
    },
    { // Section 2: TOC — Roman numerals
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN } },
      },
      footers: { default: pageNumFooter() },
      children: [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 480, after: 360 },
          children: [new TextRun({ text: "Table of Contents", bold: true, size: 32, color: PAL.primary, font: HD_FONT })],
        }),
        new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
        new Paragraph({
          spacing: { before: 200 },
          children: [new TextRun({
            text: "Note: This Table of Contents is generated via field codes. To ensure page number accuracy after editing, please right-click the TOC and select \"Update Field.\"",
            italics: true, size: 18, color: "888888", font: EN_FONT,
          })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },
    { // Section 3: Body — Arabic from 1
      properties: {
        type: SectionType.NEXT_PAGE,
        page: { size: pgSize, margin: pgMargin, pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL } },
      },
      headers: { default: docHeader() },
      footers: { default: pageNumFooter() },
      children: content,
    },
  ],
});

const OUT = "/home/z/my-project/download/Nexura-OS-Architecture-Hardening-Report.docx";
Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log("WROTE", OUT, buf.length, "bytes");
});
