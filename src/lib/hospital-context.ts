import { db } from "@/lib/db";

/**
 * Get the demo hospital (first hospital in the DB).
 * In production this would come from the logged-in user's hospitalId.
 */
export async function getDemoHospitalId(): Promise<string | null> {
  try {
    const hospital = await db.hospital.findFirst({ select: { id: true } });
    return hospital?.id || null;
  } catch {
    return null;
  }
}

export async function getDemoHospital() {
  try {
    return await db.hospital.findFirst();
  } catch {
    return null;
  }
}

/**
 * Context object for routes that access `ctx.hospital.*`.
 * Returns null when no hospital exists in the DB.
 */
export async function getDemoHospitalCtx(): Promise<{ hospital: NonNullable<
  Awaited<ReturnType<typeof getDemoHospital>>
> } | null> {
  try {
    const hospital = await db.hospital.findFirst();
    return hospital ? { hospital } : null;
  } catch {
    return null;
  }
}

/** Generate a UHID like UHID-YYYY-NNNNN */
export function generateUhid(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(10000 + Math.random() * 90000);
  return `UHID-${year}-${num}`;
}

/** Calculate age from DOB string */
export function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
  return age;
}

/** Calculate NEWS2 score from vitals */
export function calculateNEWS2(v: {
  bpSystolic?: number | null;
  bpDiastolic?: number | null;
  pulseRate?: number | null;
  temperatureC?: number | null;
  respiratoryRate?: number | null;
  spo2?: number | null;
  bloodGlucose?: number | null;
  glasgowComaScale?: number | null;
}): number {
  let score = 0;
  // Respiratory rate
  if (v.respiratoryRate) {
    if (v.respiratoryRate <= 8 || v.respiratoryRate >= 25) score += 3;
    else if (v.respiratoryRate >= 21) score += 2;
    else if (v.respiratoryRate <= 11) score += 1;
  }
  // SpO2
  if (v.spo2) {
    if (v.spo2 <= 91) score += 3;
    else if (v.spo2 <= 93) score += 2;
    else if (v.spo2 <= 95) score += 1;
  }
  // Systolic BP
  if (v.bpSystolic) {
    if (v.bpSystolic <= 90 || v.bpSystolic >= 220) score += 3;
    else if (v.bpSystolic <= 100) score += 2;
    else if (v.bpSystolic <= 110) score += 1;
    else if (v.bpSystolic >= 180) score += 2;
  }
  // Pulse
  if (v.pulseRate) {
    if (v.pulseRate <= 40 || v.pulseRate >= 131) score += 3;
    else if (v.pulseRate >= 111) score += 2;
    else if (v.pulseRate >= 91) score += 1;
    else if (v.pulseRate <= 50) score += 1;
  }
  // Temperature
  if (v.temperatureC) {
    if (v.temperatureC <= 35) score += 3;
    else if (v.temperatureC >= 39.1) score += 2;
    else if (v.temperatureC <= 36) score += 1;
    else if (v.temperatureC >= 38.1) score += 1;
  }
  // GCS
  if (v.glasgowComaScale && v.glasgowComaScale < 15) score += 3;
  return score;
}

/** Indian TPA companies */
export const TPA_COMPANIES = [
  "Star Health", "Medi-Assist", "Vidal Health", "MD India", "Heritage Health",
  "United India Insurance", "New India Assurance", "Oriental Insurance",
  "Bajaj Allianz", "ICICI Lombard", "Niva Bupa", "Aditya Birla Health",
];

/** Indian medical specialties */
export const SPECIALTIES = [
  "General Physician", "Cardiologist", "Neurologist", "Orthopedic Surgeon",
  "Pediatrician", "Gynecologist", "ENT Specialist", "Ophthalmologist",
  "Dermatologist", "Psychiatrist", "Pulmonologist", "Gastroenterologist",
  "Nephrologist", "Endocrinologist", "Oncologist", "Urologist",
  "General Surgeon", "Anesthesiologist", "Radiologist", "Pathologist",
];

/** Indian languages */
export const LANGUAGES = [
  "Hindi", "English", "Tamil", "Telugu", "Marathi", "Bengali",
  "Kannada", "Gujarati", "Punjabi", "Odia",
];

/** Ward types */
export const WARD_TYPES = [
  "general", "icu", "hdu", "maternity", "pediatric",
  "surgical", "orthopedic", "cardiac",
];

/** Blood groups */
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

/** Blood components */
export const BLOOD_COMPONENTS = [
  "whole_blood", "packed_rbc", "platelets", "ffp", "cryoprecipitate",
];
