import { describe, it, expect } from "vitest";
import {
  patientToFHIR, encounterToFHIR, observationToFHIR, medicationRequestToFHIR,
  capabilityStatement, bundleOf, FHIR_VERSION,
} from "@/lib/nx/fhir";
import {
  parseHl7, adtFromHl7, oruFromHl7, adtToHl7, oruToHl7,
} from "@/lib/nx/hl7";

describe("FHIR R4 mapping", () => {
  const patient = {
    id: "p1", uhid: "NEX-2024-00123", fullName: "Suresh Nair", gender: "male",
    dob: "1978-05-12", bloodGroup: "B+", phone: "+919876543210", abhaId: "12-3456-7890-1234", state: "Kerala",
  };

  it("maps patient with ABHA identifier and telecom", () => {
    const r = patientToFHIR(patient) as Record<string, any>;
    expect(r.resourceType).toBe("Patient");
    expect(r.identifier).toHaveLength(2);
    expect(r.identifier[1].system).toContain("abdm");
    expect(r.gender).toBe("male");
    expect(r.birthDate).toBe("1978-05-12");
    expect(r.telecom[0].value).toBe("+919876543210");
  });

  it("maps encounter status by discharge", () => {
    const a = {
      id: "e1", patientId: "p1", admissionDate: new Date("2026-09-01"),
      actualDischargeDate: null as Date | null, admissionType: "emergency",
      admissionDiagnosis: "Chest pain", status: null as string | null,
    };
    expect((encounterToFHIR(a) as any).status).toBe("in-progress");
    a.actualDischargeDate = new Date("2026-09-05");
    const done = encounterToFHIR(a) as Record<string, any>;
    expect(done.status).toBe("finished");
    expect(done.hospitalization.dischargeDisposition.text).toBe("discharged");
  });

  it("uses valueQuantity for numeric results and interpretation for criticals", () => {
    const base = {
      id: "o1", patientId: "p1", testName: "Troponin-I", unit: "ng/mL",
      abnormalFlag: "critical", reportedAt: new Date(), refRangeMin: 0, refRangeMax: 0.04,
    };
    const r = observationToFHIR({ ...base, resultValue: "2.4" }) as Record<string, any>;
    expect(r.valueQuantity.value).toBe(2.4);
    expect(r.interpretation[0].coding[0].code).toBe("AA");
    const qualitative = observationToFHIR({ ...base, resultValue: "Reactive", abnormalFlag: "normal" }) as Record<string, any>;
    expect(qualitative.valueString).toBe("Reactive");
  });

  it("maps medication request dosage instruction from order details", () => {
    const o = {
      id: "m1", patientId: "p1", priority: "stat", status: "ordered",
      createdAt: new Date(), orderingDoctorId: "d1",
      orderDetails: JSON.stringify({ items: [{ drug: "Paracetamol 650", dose: "650mg", route: "PO", frequency: "TDS" }] }),
    };
    const r = medicationRequestToFHIR(o) as Record<string, any>;
    expect(r.resourceType).toBe("MedicationRequest");
    expect(r.priority).toBe("stat");
    expect(r.dosageInstruction[0].text).toContain("650mg");
  });

  it("exposes a CapabilityStatement with the four resources", () => {
    const cs = capabilityStatement("https://x") as Record<string, any>;
    expect(cs.fhirVersion).toBe(FHIR_VERSION);
    expect(cs.rest[0].resource.map((r: any) => r.type)).toEqual(
      expect.arrayContaining(["Patient", "Encounter", "Observation", "MedicationRequest"])
    );
  });

  it("wraps search results in a searchset bundle", () => {
    const b = bundleOf("searchset", [{ resourceType: "Patient", id: "p1" }]);
    expect((b as any).type).toBe("searchset");
    expect((b as any).total).toBe(1);
  });
});

describe("HL7 v2 interface", () => {
  const ADT_A01 = "MSH|^~\\&|HIS|CENTRAL|NEXURA|WARD|202609101200||ADT^A01|MSG00001|P|2.4\rEVN|A01|202609101200\rPID|1||NEX-2024-00123^^^NEX^MR||Nair^Suresh||19780512|M\rPV1|1|I|ICU-12^^^||||Iyer^Meera";

  it("parses MSH and routes ADT^A01 with demographics", () => {
    const m = parseHl7(ADT_A01);
    expect(m.ok).toBe(true);
    if (m.ok) {
      const adt = adtFromHl7(m.msg);
      expect(adt.ok).toBe(true);
      if (adt.ok) {
        expect(adt.data.uhid).toBe("NEX-2024-00123");
        expect(adt.data.patientName).toBe("Suresh Nair");
        expect(adt.data.sex).toBe("M");
        expect(adt.data.bed).toBe("12");
      }
    }
  });

  it("rejects non-HL7 payloads and unsupported types", () => {
    expect(parseHl7("hello world").ok).toBe(false);
    const m = parseHl7(ADT_A01.replace("ADT^A01", "ADT^Z99"));
    expect(m.ok).toBe(false);
  });

  it("parses ORU^R01 with flags", () => {
    const ORU = "MSH|^~\\&|LIS|LAB|NEXURA|NEXURA|202609101205||ORU^R01|MSG00002|P|2.4\rPID|1||NEX-2024-00123^^^NEX^MR\rOBX|1|NM|Potassium||6.2|mmol/L|3.5-5.1|HH|||F";
    const m = parseHl7(ORU);
    expect(m.ok).toBe(true);
    if (m.ok) {
      const oru = oruFromHl7(m.msg);
      expect(oru.ok).toBe(true);
      if (oru.ok) {
        expect(oru.data.results[0].flag).toBe("critical");
        expect(oru.data.results[0].value).toBe("6.2");
      }
    }
  });

  it("serializes outbound ADT/ORU that round-trip through the parser", () => {
    const adt = adtToHl7({ uhid: "NEX-2024-00123", fullName: "Suresh Nair", gender: "male", dob: "1978-05-12", ward: "ICU" });
    const m = parseHl7(adt);
    expect(m.ok).toBe(true);
    if (m.ok) expect(m.msg.messageType).toBe("ADT^A08");

    const oru = oruToHl7({ uhid: "NEX-2024-00123", results: [{ testName: "Potassium", value: "6.2", unit: "mmol/L", flag: "critical" }] });
    const m2 = parseHl7(oru);
    expect(m2.ok).toBe(true);
    if (m2.ok) {
      const oru2 = oruFromHl7(m2.msg);
      if (oru2.ok) expect(oru2.data.results[0].flag).toBe("critical");
    }
  });
});
