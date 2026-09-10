import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { audit } from "@/lib/nx/audit";
import { publish } from "@/lib/nx/bus";
import { fail, guard, parseBody, withRoute } from "@/lib/nx/api";
import { hasPermission, requirePermission } from "@/lib/nx/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * CLINICAL NOTE LIFECYCLE — draft → signed → (addendum | amend→new version)
 * Invariants enforced server-side:
 *  1. Signed notes are LOCKED: content edits are rejected (423).
 *  2. Every mutation snapshots a NxNoteVersion (full history).
 *  3. Signing requires note.sign permission and stamps actor + time.
 *  4. Addenda create a NEW draft note chained to the signed original.
 *  5. Restricted notes need patient.restricted.view to read content.
 */

const PatchSchema = z.object({
  action: z.enum(["save", "sign", "addendum"]),
  subjective: z.string().max(8000).optional(),
  objective: z.string().max(8000).optional(),
  assessment: z.string().max(8000).optional(),
  plan: z.string().max(8000).optional(),
  fullText: z.string().max(20000).optional(),
  noteType: z.enum(["soap", "progress", "discharge", "procedure", "referral"]).optional(),
  restricted: z.boolean().optional(),
  body: z.string().max(8000).optional(), // for addendum
});

export const GET = withRoute("notes.get", async (req: NextRequest, { requestId }) => {
  void requestId;
  const id = req.nextUrl.pathname.split("/").pop() as string;
  const gate = await requirePermission(req, "patient.clinical.view");
  if ("error" in gate) return NextResponse.json({ error: gate.error, detail: gate.detail }, { status: gate.status });
  if (!gate.session.hospitalId) return fail("no_hospital", 400);
  // Tenant-scoped: notes from other hospitals are invisible.
  const note = await db.clinicalNote.findFirst({
    where: { id, hospitalId: gate.session.hospitalId },
    include: { versions: { orderBy: { version: "desc" } } },
  });
  if (!note) return fail("not_found", 404);
  const canRestricted = hasPermission(gate.perms, "patient.restricted.view") || gate.session.breakGlass;
  return NextResponse.json({
    data: {
      note: {
        id: note.id, patientId: note.patientId, uhid: note.patientUhid, noteType: note.noteType,
        status: note.status, locked: note.locked, version: note.currentVersion, restricted: note.restricted,
        author: note.doctorId, signedAt: note.signedAt, signedByName: note.signedByName, signedByRole: note.signedByRole,
        addendumToNoteId: note.addendumToNoteId,
        subjective: canRestricted || !note.restricted ? note.subjective : null,
        objective: canRestricted || !note.restricted ? note.objective : null,
        assessment: canRestricted || !note.restricted ? note.assessment : null,
        plan: canRestricted || !note.restricted ? note.plan : null,
        fullText: canRestricted || !note.restricted ? note.fullText : null,
        restrictedBlocked: note.restricted && !canRestricted,
      },
      versions: note.versions.map((v) => ({ version: v.version, changeKind: v.changeKind, authorName: v.authorName, authorRole: v.authorRole, signedAt: v.signedAt, at: v.createdAt })),
    },
  });
});

export const PATCH = withRoute("notes.mutate", async (req: NextRequest) => {
  const id = req.nextUrl.pathname.split("/").pop() as string;
  const gate = await requirePermission(req, "note.edit");
  if ("error" in gate) return NextResponse.json({ error: gate.error, detail: gate.detail }, { status: gate.status });
  const session = gate.session;
  const body = await parseBody(req, PatchSchema);
  if ("response" in body) return body.response;

  const note = await db.clinicalNote.findUnique({ where: { id } });
  if (!note) return fail("not_found", 404, "Note not found.");
  if (note.hospitalId !== session.hospitalId) return fail("forbidden", 403, "Cross-hospital access denied.");

  // ---- IMMUTABILITY: signed notes never silently mutate ----
  if (note.locked && body.data.action === "save") {
    return fail("note_locked", 423, "This note is signed and locked. Create an addendum or an amending note instead.");
  }
  if (note.locked && body.data.action === "sign") {
    return fail("already_signed", 409, "This note is already signed.");
  }

  if (body.data.action === "save") {
    // Snapshot current content before overwrite
    await db.$transaction([
      db.nxNoteVersion.create({
        data: {
          noteId: note.id, version: note.currentVersion, changeKind: "edit",
          authorName: session.name, authorRole: session.role,
          snapshot: JSON.stringify({ subjective: note.subjective, objective: note.objective, assessment: note.assessment, plan: note.plan, fullText: note.fullText, noteType: note.noteType }),
        },
      }),
      db.clinicalNote.update({
        where: { id: note.id },
        data: {
          subjective: body.data.subjective ?? note.subjective,
          objective: body.data.objective ?? note.objective,
          assessment: body.data.assessment ?? note.assessment,
          plan: body.data.plan ?? note.plan,
          fullText: body.data.fullText ?? note.fullText,
          noteType: body.data.noteType ?? note.noteType,
          restricted: body.data.restricted ?? note.restricted,
          currentVersion: note.currentVersion + 1,
        },
      }),
    ]);
    if (session.hospitalId) {
      await audit({ hospitalId: session.hospitalId, actorName: session.staffCode ?? session.name, actorRole: session.role, action: "note.edit", entityType: "clinical_note", entityId: note.id, patientId: note.patientId, detail: { version: note.currentVersion + 1 } });
    }
    const fresh = await db.clinicalNote.findUnique({ where: { id: note.id } });
    return NextResponse.json({ data: { note: fresh } });
  }

  if (body.data.action === "sign") {
    const canSign = hasPermission(gate.perms, "note.sign");
    if (!canSign) return fail("forbidden", 403, "Signing requires the note.sign permission.");
    await db.$transaction([
      db.nxNoteVersion.create({
        data: {
          noteId: note.id, version: note.currentVersion + 1, changeKind: "sign",
          authorName: session.name, authorRole: session.role, signedAt: new Date(),
          snapshot: JSON.stringify({ subjective: note.subjective, objective: note.objective, assessment: note.assessment, plan: note.plan, fullText: note.fullText, noteType: note.noteType }),
        },
      }),
      db.clinicalNote.update({
        where: { id: note.id },
        data: {
          status: "signed", locked: true, signedAt: new Date(),
          signedByName: session.name, signedByRole: session.role,
          currentVersion: note.currentVersion + 1,
        },
      }),
    ]);
    if (session.hospitalId) {
      await audit({ hospitalId: session.hospitalId, actorName: session.staffCode ?? session.name, actorRole: session.role, action: "note.sign", entityType: "clinical_note", entityId: note.id, patientId: note.patientId, detail: { version: note.currentVersion + 1 } });
      publish({ event: "note.signed", hospitalId: session.hospitalId, toRoles: ["doctor", "nurse", "command", "admin", "hospital_admin"], data: { noteId: note.id, patientId: note.patientId } });
    }
    const fresh = await db.clinicalNote.findUnique({ where: { id: note.id } });
    return NextResponse.json({ data: { note: fresh, signed: true } });
  }

  // ---- addendum: new draft chained to the signed original ----
  if (!note.locked) return fail("not_signed", 409, "Addenda apply to signed notes. Save your draft instead.");
  if (!body.data.body || body.data.body.trim().length < 3) return fail("invalid_request", 400, "Addendum text is required.");
  const addendum = await db.clinicalNote.create({
    data: {
      hospitalId: note.hospitalId,
      patientUhid: note.patientUhid,
      patientId: note.patientId,
      doctorId: null,
      admissionId: note.admissionId,
      appointmentId: note.appointmentId,
      noteType: "progress",
      status: "signed", // addenda are signed on creation (attribution fixed)
      signedAt: new Date(),
      signedByName: session.name,
      signedByRole: session.role,
      locked: true,
      addendumToNoteId: note.id,
      currentVersion: 1,
      fullText: `ADDENDUM to note ${note.id.slice(-6)}: ${body.data.body.trim()}`,
    },
  });
  await db.nxNoteVersion.create({
    data: { noteId: addendum.id, version: 1, changeKind: "addendum", authorName: session.name, authorRole: session.role, signedAt: new Date(), snapshot: JSON.stringify({ fullText: addendum.fullText }) },
  });
  if (session.hospitalId) {
    await audit({ hospitalId: session.hospitalId, actorName: session.staffCode ?? session.name, actorRole: session.role, action: "note.addendum", entityType: "clinical_note", entityId: addendum.id, patientId: note.patientId, detail: { originalNoteId: note.id } });
  }
  return NextResponse.json({ data: { note: addendum, addendum: true } }, { status: 201 });
});

/** POST — create a new draft note. */
const CreateSchema = z.object({
  patientId: z.string().min(3),
  admissionId: z.string().optional(),
  appointmentId: z.string().optional(),
  noteType: z.enum(["soap", "progress", "discharge", "procedure", "referral"]).default("progress"),
  subjective: z.string().max(8000).optional(),
  objective: z.string().max(8000).optional(),
  assessment: z.string().max(8000).optional(),
  plan: z.string().max(8000).optional(),
  fullText: z.string().max(20000).optional(),
  restricted: z.boolean().default(false),
});

export const POST = withRoute("notes.create", async (req: NextRequest) => {
  const gate = await requirePermission(req, "note.edit");
  if ("error" in gate) return NextResponse.json({ error: gate.error, detail: gate.detail }, { status: gate.status });
  const session = gate.session;
  if (!session.hospitalId) return fail("no_hospital", 400);
  const body = await parseBody(req, CreateSchema);
  if ("response" in body) return body.response;

  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId: session.hospitalId }, select: { id: true, uhid: true } });
  if (!patient) return fail("not_found", 404, "Patient not found in your hospital.");

  const note = await db.clinicalNote.create({
    data: {
      hospitalId: session.hospitalId,
      patientId: patient.id,
      patientUhid: patient.uhid,
      admissionId: body.data.admissionId,
      appointmentId: body.data.appointmentId,
      noteType: body.data.noteType,
      subjective: body.data.subjective,
      objective: body.data.objective,
      assessment: body.data.assessment,
      plan: body.data.plan,
      fullText: body.data.fullText,
      restricted: body.data.restricted,
      status: "draft",
    },
  });
  await db.nxNoteVersion.create({
    data: { noteId: note.id, version: 1, changeKind: "create", authorName: session.name, authorRole: session.role, snapshot: JSON.stringify({ fullText: note.fullText, noteType: note.noteType }) },
  });
  await audit({ hospitalId: session.hospitalId, actorName: session.staffCode ?? session.name, actorRole: session.role, action: "note.create", entityType: "clinical_note", entityId: note.id, patientId: patient.id });
  return NextResponse.json({ data: { note } }, { status: 201 });
});
