/* ============================================================
   NEXURA OS v5 — HL7 v2.x INTERFACE LAYER
   Minimal, strict, dependency-free: ADT^A01/A08 (admit/update)
   and ORU^R01 (lab result) inbound; ADT^A08 + ORU^R01 outbound.
   Pure functions (unit-testable). MSH-9/MSH-10 drive dispatch.
   Encoding defaults: ^~\& segments \r. We tolerate \n on input.
   ============================================================ */

export interface Hl7Message {
  sendingApp: string;
  receivingApp: string;
  messageType: string; // ADT^A01
  controlId: string;
  segments: Record<string, string[][]>; // SID -> [[f1,f2..],[..]]
}

export function parseHl7(raw: string): { ok: true; msg: Hl7Message } | { ok: false; error: string } {
  const text = raw.replace(/\r\n/g, "\r").replace(/\n/g, "\r").trim();
  if (!text.startsWith("MSH")) return { ok: false, error: "Message must start with MSH segment." };
  const segments: Record<string, string[][]> = {};
  for (const seg of text.split("\r")) {
    if (!seg.trim()) continue;
    const fields = seg.split("|");
    const sid = fields[0];
    segments[sid] = segments[sid] || [];
    segments[sid].push(fields.map((f) => f.replace(/\r/g, "")));
  }
  const msh = segments.MSH[0];
  // MSH-2 is encoding chars (^~\&); field indices shift by one before MSH-2
  const messageType = msh[8] ?? ""; // MSH-9
  const controlId = msh[10] ?? `nx-${Date.now()}`; // MSH-10
  const sendingApp = msh[2] ?? "unknown"; // MSH-3
  const receivingApp = msh[4] ?? "NEXURA"; // MSH-5
  if (!/^(ADT|ORU)\^[A-Z0-9]{2,3}$/.test(messageType)) {
    return { ok: false, error: `Unsupported message type "${messageType}". Supported: ADT^A01, ADT^A08, ORU^R01.` };
  }
  return { ok: true, msg: { sendingApp, receivingApp, messageType, controlId, segments } };
}

export interface AdtInbound {
  kind: "ADT";
  trigger: "A01" | "A08";
  uhid: string;
  patientName: string;
  sex: "M" | "F" | "O";
  dob?: string;
  ward?: string;
  bed?: string;
  attendingDoctor?: string;
  controlId: string;
}

export function adtFromHl7(msg: Hl7Message): { ok: true; data: AdtInbound } | { ok: false; error: string } {
  const pid = msg.segments.PID?.[0];
  if (!pid) return { ok: false, error: "Missing PID segment." };
  const name = (pid[5] ?? "").split("^").filter(Boolean).reverse().join(" ");
  const trigger = msg.messageType.split("^")[1] as "A01" | "A08";
  const pv1 = msg.segments.PV1?.[0];
  return {
    ok: true,
    data: {
      kind: "ADT", trigger,
      uhid: pid[3] ?? "",
      patientName: name || "Unknown",
      sex: pid[8] === "F" ? "F" : pid[8] === "M" ? "M" : "O",
      dob: pid[7] || undefined,
      ward: pv1?.[3] || undefined,
      bed: pv1?.[3]?.includes("-") ? pv1[3].split("-")[1] : undefined,
      attendingDoctor: (pv1?.[7] ?? "").split("^").reverse().join(" ") || undefined,
      controlId: msg.controlId,
    },
  };
}

export interface OruInbound {
  kind: "ORU";
  uhid: string;
  controlId: string;
  results: { testName: string; value: string; unit?: string; flag: "normal" | "low" | "high" | "critical"; refRange?: string }[];
}

export function oruFromHl7(msg: Hl7Message): { ok: true; data: OruInbound } | { ok: false; error: string } {
  const pid = msg.segments.PID?.[0];
  const obxAll = msg.segments.OBX ?? [];
  if (!pid) return { ok: false, error: "Missing PID segment." };
  if (!obxAll.length) return { ok: false, error: "Missing OBX segment(s)." };
  const results = obxAll.map((obx) => {
    const flagRaw = obx[8] ?? "N";
    const flag = flagRaw === "H" ? "high" : flagRaw === "L" ? "low" : flagRaw === "HH" || flagRaw === "LL" ? "critical" : "normal";
    return {
      testName: obx[3] ?? "Unknown test",
      value: obx[5] ?? "",
      unit: obx[6] || undefined,
      flag: flag as OruInbound["results"][number]["flag"],
      refRange: obx[7] || undefined,
    };
  });
  return { ok: true, data: { kind: "ORU", uhid: pid[3] ?? "", controlId: msg.controlId, results } };
}

const TS = (d: Date) =>
  `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}${String(d.getHours()).padStart(2, "0")}${String(d.getMinutes()).padStart(2, "0")}`;

export function adtToHl7(p: {
  uhid: string; fullName: string; gender: string; dob: string | null;
  ward?: string | null; attendingDoctor?: string | null;
}, trigger: "A08" = "A08"): string {
  const lastNameFirst = p.fullName.split(" ").slice(-1)[0] ?? p.fullName;
  const firstName = p.fullName.split(" ").slice(0, -1).join(" ");
  const segs = [
    `MSH|^~\\&|NEXURA|${p.uhid.slice(0, 4)}|HIS|NEXURA|${TS(new Date())}||ADT^${trigger}|${Date.now()}|P|2.4`,
    `EVN|${trigger}|${TS(new Date())}`,
    `PID|1||${p.uhid}^^^NEXURA^MR||${lastNameFirst}^${firstName}||${(p.dob ?? "").replace(/-/g, "")}|${p.gender === "female" ? "F" : p.gender === "male" ? "M" : "O"}`,
    `PV1|1|I|${p.ward ?? "OPD"}^^^||||${(p.attendingDoctor ?? "").split(" ").slice(-1)[0] ?? ""}^||`,
  ];
  return segs.join("\r");
}

export function oruToHl7(args: {
  uhid: string; results: { testName: string; value: string; unit?: string; flag: "normal" | "low" | "high" | "critical"; refRange?: string }[];
}): string {
  const flagOf = (f: string) => (f === "high" ? "H" : f === "low" ? "L" : f === "critical" ? "HH" : "N");
  const segs = [
    `MSH|^~\\&|NEXURA|LAB|LIS|NEXURA|${TS(new Date())}||ORU^R01|${Date.now()}|P|2.4`,
    `PID|1||${args.uhid}^^^NEXURA^MR`,
  ];
  args.results.forEach((r, i) => {
    segs.push(`OBX|${i + 1}|NM|${r.testName.replace(/[|^]/g, "")}||${r.value}|${r.unit ?? ""}|${r.refRange ?? ""}|${flagOf(r.flag)}|||F|||${TS(new Date())}||LAB`);
  });
  return segs.join("\r");
}
