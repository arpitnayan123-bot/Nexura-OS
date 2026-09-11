import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getOrCreateSubject } from "@/modules/foresight/subject";
import { runForesight, summarizeForDoctor } from "@/modules/foresight/engine";
import type { ForesightInput } from "@/modules/foresight/types";

/* POST /api/nx/foresight/run — validate input, run the engine
   server-side (authoritative version), persist the run, return
   the full report + clinician summary. */

export const dynamic = "force-dynamic";

const SEXES = new Set(["male", "female", "intersex", "undisclosed"]);
const DIET_TYPES = new Set(["vegetarian", "eggetarian", "non_veg", "vegan", "jain"]);
const CUISINES = new Set(["north", "south", "east", "west", "northeast", "mixed"]);
const BANDS = new Set(["none", "rare", "weekly", "daily"]);
const SALTS = new Set(["low", "moderate", "high"]);
const BALANCES = new Set(["rice_heavy", "balanced", "roti_heavy"]);
const OCCUPATIONS = new Set(["desk", "field", "household", "student", "other"]);
const QUALITIES = new Set(["poor", "fair", "good"]);
const SNORINGS = new Set(["none", "occasional", "loud_regular"]);
const SLEEPIES = new Set(["none", "mild", "severe"]);
const SCHEDULES = new Set(["regular", "irregular"]);
const GLUCOSE_CTX = new Set(["fasting", "random", "post_meal"]);
const TOBACCOS = new Set(["never", "former", "current_smoke", "smokeless"]);
const ALCOHOLS = new Set(["never", "occasional", "weekly", "daily"]);
const STRESSES = new Set(["low", "moderate", "high"]);
const AQIS = new Set(["unknown", "good", "moderate", "poor", "very_poor", "severe"]);
const FAM_KEYS = new Set(["diabetes", "heart_disease", "hypertension", "thyroid", "cancer", "pcos", "obesity"]);

const num = (v: unknown, min: number, max: number): number | undefined => {
  const n = typeof v === "string" ? Number(v) : v;
  if (typeof n !== "number" || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
};
const pick = <T extends string>(v: unknown, allowed: Set<string>, fallback: T): T =>
  (typeof v === "string" && allowed.has(v) ? v : fallback) as T;

export async function POST(req: Request) {
  let raw: Record<string, unknown>;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const p = (raw.profile ?? {}) as Record<string, unknown>;
    const diet = (raw.diet ?? {}) as Record<string, unknown>;
    const act = (raw.activity ?? {}) as Record<string, unknown>;
    const slp = (raw.sleep ?? {}) as Record<string, unknown>;
    const vit = (raw.vitals ?? {}) as Record<string, unknown>;
    const labs = (raw.labs ?? {}) as Record<string, unknown>;
    const hist = (raw.history ?? {}) as Record<string, unknown>;
    const env = (raw.environment ?? {}) as Record<string, unknown>;

    const ageYears = num(p.ageYears, 0, 120);
    if (!ageYears || ageYears < 18) {
      return NextResponse.json(
        { ok: false, error: "Nexura Predictive is built for adults (18+). For children and teens, please consult a paediatrician." },
        { status: 422 }
      );
    }

    const symptomsRaw = Array.isArray(raw.symptoms) ? raw.symptoms : [];
    const symptoms = symptomsRaw.slice(0, 40).map((s) => {
      const o = (s ?? {}) as Record<string, unknown>;
      return {
        id: String(o.id ?? "").slice(0, 64),
        severity: num(o.severity, 1, 10) ?? 5,
        onsetDays: num(o.onsetDays, 0, 3650) ?? 1,
        worsening: o.worsening === true,
      };
    }).filter((s) => s.id.startsWith("sym."));

    const input: ForesightInput = {
      profile: {
        ageYears,
        sexAtBirth: pick(p.sexAtBirth, SEXES, "undisclosed"),
        heightCm: num(p.heightCm, 90, 230),
        weightKg: num(p.weightKg, 25, 350),
        waistCm: num(p.waistCm, 50, 200),
        pregnancyPossibility: p.pregnancyPossibility === true,
      },
      symptoms,
      diet: {
        type: pick(diet.type, DIET_TYPES, "vegetarian"),
        cuisine: pick(diet.cuisine, CUISINES, "mixed"),
        sweetsPerWeek: pick(diet.sweetsPerWeek, BANDS, "rare"),
        friedPerWeek: pick(diet.friedPerWeek, BANDS, "rare"),
        sugaryDrinksPerWeek: pick(diet.sugaryDrinksPerWeek, BANDS, "rare"),
        riceRotiBalance: pick(diet.riceRotiBalance, BALANCES, "balanced"),
        salt: pick(diet.salt, SALTS, "moderate"),
        breakfastSkipped: diet.breakfastSkipped === true,
        outsideFoodPerWeek: num(diet.outsideFoodPerWeek, 0, 21) ?? 0,
      },
      activity: {
        minutesPerWeek: num(act.minutesPerWeek, 0, 3000) ?? 0,
        kinds: Array.isArray(act.kinds) ? act.kinds.map(String).slice(0, 8) : [],
        occupation: pick(act.occupation, OCCUPATIONS, "other"),
        shiftWork: act.shiftWork === true,
      },
      sleep: {
        hoursPerNight: num(slp.hoursPerNight, 0, 14) ?? 0,
        quality: pick(slp.quality, QUALITIES, "fair"),
        snoring: pick(slp.snoring, SNORINGS, "none"),
        daytimeSleepiness: pick(slp.daytimeSleepiness, SLEEPIES, "none"),
        schedule: pick(slp.schedule, SCHEDULES, "regular"),
        screensBeforeBed: slp.screensBeforeBed === true,
      },
      vitals: {
        systolic: num(vit.systolic, 60, 260),
        diastolic: num(vit.diastolic, 40, 160),
        pulse: num(vit.pulse, 30, 220),
        glucoseMgDl: num(vit.glucoseMgDl, 20, 700),
        glucoseContext: pick(vit.glucoseContext, GLUCOSE_CTX, "random"),
        spo2: num(vit.spo2, 50, 100),
      },
      labs: {
        hba1cPct: num(labs.hba1cPct, 3, 18),
        hemoglobinGdl: num(labs.hemoglobinGdl, 3, 22),
        tshMiuL: num(labs.tshMiuL, 0.01, 100),
        vitaminDNgMl: num(labs.vitaminDNgMl, 1, 150),
        b12PgMl: num(labs.b12PgMl, 30, 3000),
        ldlMgDl: num(labs.ldlMgDl, 30, 400),
        hdlMgDl: num(labs.hdlMgDl, 10, 150),
        triglyceridesMgDl: num(labs.triglyceridesMgDl, 30, 2000),
      },
      history: {
        conditions: Array.isArray(hist.conditions) ? hist.conditions.map(String).slice(0, 15) : [],
        familyHistory: Array.isArray(hist.familyHistory)
          ? (hist.familyHistory.map(String).filter((k) => FAM_KEYS.has(k)) as ForesightInput["history"]["familyHistory"])
          : [],
        tobacco: pick(hist.tobacco, TOBACCOS, "never"),
        alcohol: pick(hist.alcohol, ALCOHOLS, "never"),
        stress: pick(hist.stress, STRESSES, "moderate"),
        moodLowDays: num(hist.moodLowDays, 0, 14) ?? 0,
        menstruationRegular: p.sexAtBirth === "female" ? (hist.menstruationRegular === true ? true : hist.menstruationRegular === false ? false : undefined) : undefined,
      },
      environment: {
        aqiBand: pick(env.aqiBand, AQIS, "unknown"),
        sunlightMinutesPerDay: num(env.sunlightMinutesPerDay, 0, 600),
        city: typeof env.city === "string" ? env.city.slice(0, 60) : undefined,
      },
      freeText: typeof raw.freeText === "string" ? raw.freeText.slice(0, 2000) : undefined,
    };

    /* Engine runs server-side — the versions stamped here are authoritative. */
    const report = runForesight(input);
    const doctorSummary = summarizeForDoctor(report, input);

    const subjectKey = await getOrCreateSubject();
    const topDomainId = report.topDomainIds[0] ?? "metabolic";
    const created = await db.foresightRun.create({
      data: {
        subjectKey,
        score: report.foresightScore,
        band: report.scoreBand,
        triageLevel: report.triage.level,
        topDomainId,
        inputJson: JSON.stringify(input),
        reportJson: JSON.stringify(report),
        engineVer: report.engineVersion,
      },
    });

    return NextResponse.json({
      ok: true,
      data: { id: created.id, report, doctorSummary },
    });
  } catch (err) {
    console.error("[foresight/run]", err);
    return NextResponse.json(
      { ok: false, error: "The foresight engine could not complete. Nothing was saved incorrectly — please retry." },
      { status: 500 }
    );
  }
}
