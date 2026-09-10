import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";
import { audit } from "@/lib/nx/audit";

/* DICOM study registry + external viewer abstraction.
   Nexura never renders pixels — it registers studies and hands off to the
   hospital's viewer (OHIF / Horos / vendor PACS web viewer) via deep links,
   keeping the core app light. Viewer template configurable via env:
   DICOM_VIEWER_TEMPLATE="https://viewer.hospital.example/viewer?StudyInstanceUIDs={studyUid}" */

const RegisterSchema = z.object({
  patientId: z.string().min(4),
  accession: z.string().min(2).max(60),
  studyUid: z.string().min(6).max(80),
  modality: z.enum(["CXR", "CT", "MR", "US", "ECG", "DX", "CR"]),
  bodyPart: z.string().max(60).optional(),
  seriesCount: z.number().int().min(1).max(5000).optional(),
});

function viewerUrlFor(studyUid: string): string {
  const tpl = process.env.DICOM_VIEWER_TEMPLATE;
  if (!tpl) return null as unknown as string;
  return tpl.replace("{studyUid}", encodeURIComponent(studyUid));
}

export const GET = withRoute("dicom.studies", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.clinical.view");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const patientId = req.nextUrl.searchParams.get("patientId");
  const studies = await db.nxDicomStudy.findMany({
    where: { hospitalId, ...(patientId ? { patientId } : {}) },
    orderBy: { createdAt: "desc" },
    take: 60,
  });
  return ok(
    studies.map((s) => ({
      ...s,
      viewerUrl: s.viewerUrl ?? viewerUrlFor(s.studyUid),
      viewerConfigured: Boolean(s.viewerUrl || process.env.DICOM_VIEWER_TEMPLATE),
    })),
    { requestId }
  );
});

export const POST = withRoute("dicom.register", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "imaging.report.write");
  if ("response" in g) return g.response;
  const hospitalId = g.session.hospitalId;
  if (!hospitalId) return fail("no_hospital_context", 403, undefined, requestId);
  const body = await parseBody(req, RegisterSchema);
  if ("response" in body) return body.response;
  const patient = await db.hospitalPatient.findFirst({ where: { id: body.data.patientId, hospitalId } });
  if (!patient) return fail("unknown_patient", 404, undefined, requestId);
  const study = await db.nxDicomStudy.create({
    data: {
      hospitalId,
      patientId: patient.id,
      accession: body.data.accession,
      studyUid: body.data.studyUid,
      modality: body.data.modality,
      bodyPart: body.data.bodyPart,
      seriesCount: body.data.seriesCount ?? 1,
      viewerUrl: viewerUrlFor(body.data.studyUid),
    },
  });
  await audit({ hospitalId, actorName: g.session.name, actorRole: g.session.role, action: "dicom.study.registered", entityType: "nx_dicom_study", entityId: study.id, patientId: patient.id });
  return ok({ id: study.id, viewerUrl: study.viewerUrl }, { requestId, status: 201 });
});
