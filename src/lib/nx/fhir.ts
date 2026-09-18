/* ============================================================
   NEXURA OS v5 — FHIR R4 MAPPING LAYER (read-side)
   Maps internal entities to FHIR R4 resources. Deterministic,
   pure functions (unit-testable). Identifiers preserve internal
   ids so partners can correlate. No PHI leaves the tenant scope:
   the calling route enforces hospital scoping BEFORE mapping.
   Spec: http://hl7.org/fhir/R4/ (Patient, Encounter, Observation,
   MedicationRequest, CapabilityStatement).
   ============================================================ */

export const FHIR_VERSION = "4.0.1";

type Json = Record<string, unknown>;

export function patientToFHIR(p: {
  id: string;
  uhid: string;
  fullName: string;
  gender: string;
  dob: string | null;
  bloodGroup: string | null;
  phone: string | null;
  abhaId?: string | null;
  state?: string | null;
}): Json {
  const identifier: Json[] = [{ system: "urn:nexura:uhid", value: p.uhid }];
  if (p.abhaId) identifier.push({ system: "https://healthid.abdm.gov.in", value: p.abhaId });
  return {
    resourceType: "Patient",
    id: p.id,
    identifier,
    active: true,
    name: [{ use: "official", text: p.fullName }],
    gender:
      p.gender === "male" || p.gender === "female" || p.gender === "other" ? p.gender : "unknown",
    birthDate: p.dob ?? undefined,
    telecom: p.phone ? [{ system: "phone", value: p.phone }] : undefined,
    address: p.state ? [{ state: p.state, country: "IN" }] : undefined,
  };
}

export function encounterToFHIR(a: {
  id: string;
  patientId: string;
  admissionDate: Date;
  actualDischargeDate: Date | null;
  admissionType: string;
  admissionDiagnosis: string | null;
  status: string | null;
}): Json {
  const status = a.actualDischargeDate
    ? "finished"
    : a.status === "expired"
      ? "finished"
      : "in-progress";
  return {
    resourceType: "Encounter",
    id: a.id,
    status,
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: a.admissionType === "elective" ? "AMB" : "EMER",
      display: a.admissionType === "elective" ? "ambulatory" : "emergency",
    },
    subject: { reference: `Patient/${a.patientId}` },
    period: { start: a.admissionDate.toISOString(), end: a.actualDischargeDate?.toISOString() },
    reasonCode: a.admissionDiagnosis ? [{ text: a.admissionDiagnosis }] : undefined,
    hospitalization: a.actualDischargeDate
      ? { dischargeDisposition: { text: a.status ?? "discharged" } }
      : undefined,
  };
}

export function observationToFHIR(r: {
  id: string;
  patientId: string;
  testName: string;
  resultValue: string | null;
  unit: string | null;
  abnormalFlag: string;
  reportedAt: Date | null;
  refRangeMin: number | null;
  refRangeMax: number | null;
}): Json {
  const interpretation =
    r.abnormalFlag === "critical"
      ? [
          {
            coding: [
              {
                system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                code: "AA",
                display: "Critical abnormal",
              },
            ],
          },
        ]
      : r.abnormalFlag === "high" || r.abnormalFlag === "low"
        ? [
            {
              coding: [
                {
                  system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
                  code: r.abnormalFlag.toUpperCase(),
                  display: r.abnormalFlag,
                },
              ],
            },
          ]
        : undefined;
  const num = Number(r.resultValue);
  return {
    resourceType: "Observation",
    id: r.id,
    status: r.reportedAt ? "final" : "preliminary",
    category: [
      {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/observation-category",
            code: "laboratory",
          },
        ],
      },
    ],
    code: { text: r.testName },
    subject: { reference: `Patient/${r.patientId}` },
    effectiveDateTime: r.reportedAt?.toISOString(),
    valueString:
      Number.isFinite(num) && r.resultValue !== null && `${num}` === r.resultValue.trim()
        ? undefined
        : (r.resultValue ?? undefined),
    valueQuantity:
      Number.isFinite(num) && r.resultValue !== null
        ? { value: num, unit: r.unit ?? undefined, system: "http://unitsofmeasure.org" }
        : undefined,
    interpretation,
    referenceRange:
      r.refRangeMin !== null || r.refRangeMax !== null
        ? [
            {
              low: r.refRangeMin !== null ? { value: r.refRangeMin } : undefined,
              high: r.refRangeMax !== null ? { value: r.refRangeMax } : undefined,
            },
          ]
        : undefined,
  };
}

export function medicationRequestToFHIR(o: {
  id: string;
  patientId: string;
  orderDetails: string;
  priority: string;
  status: string;
  createdAt: Date;
  orderingDoctorId: string | null;
}): Json {
  let items: {
    drug?: string;
    dose?: string;
    route?: string;
    frequency?: string;
    durationDays?: number;
  }[] = [];
  try {
    const d = JSON.parse(o.orderDetails);
    items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [d];
  } catch {
    /* defensive: unparseable detail → empty */
  }
  const statusMap: Record<string, string> = {
    ordered: "active",
    acknowledged: "active",
    in_progress: "active",
    completed: "completed",
    cancelled: "cancelled",
  };
  return {
    resourceType: "MedicationRequest",
    id: o.id,
    status: statusMap[o.status] ?? "unknown",
    intent: "order",
    priority: o.priority === "stat" ? "stat" : o.priority === "urgent" ? "urgent" : "routine",
    medicationCodeableConcept: {
      text:
        items
          .map((i) => i.drug)
          .filter(Boolean)
          .join(", ") || "medication order",
    },
    subject: { reference: `Patient/${o.patientId}` },
    authoredOn: o.createdAt.toISOString(),
    requester: o.orderingDoctorId ? { reference: `Practitioner/${o.orderingDoctorId}` } : undefined,
    dosageInstruction: items.map((i) => ({
      text: [i.dose, i.route, i.frequency].filter(Boolean).join(" "),
      timing: i.frequency ? { code: { text: i.frequency } } : undefined,
    })),
  };
}

export function capabilityStatement(baseUrl: string): Json {
  const res = (type: string, search: string[]) => ({
    type,
    interaction: [{ code: "read" }, { code: "search-type" }],
    searchParam: search.map((name) => ({ name, type: "token" })),
  });
  return {
    resourceType: "CapabilityStatement",
    status: "active",
    date: new Date().toISOString().slice(0, 10),
    publisher: "Nexura Hospital OS",
    kind: "capability",
    software: { name: "Nexura Hospital OS", version: "5.0" },
    implementation: {
      description: "Nexura FHIR R4 read API",
      url: `${baseUrl}/api/nx/fhir/metadata`,
    },
    fhirVersion: FHIR_VERSION,
    format: ["json"],
    rest: [
      {
        mode: "server",
        resource: [
          res("Patient", ["identifier", "name", "gender"]),
          res("Encounter", ["patient", "status"]),
          res("Observation", ["patient", "code"]),
          res("MedicationRequest", ["patient", "status"]),
        ],
        security: { description: "JWT httpOnly session (staff) or scoped API key (partners)" },
      },
    ],
  };
}

export function bundleOf(type: string, entries: Json[]): Json {
  return {
    resourceType: "Bundle",
    type,
    total: entries.length,
    entry: entries.map((r) => ({ resource: r })),
  };
}
