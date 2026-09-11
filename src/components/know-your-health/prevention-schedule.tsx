"use client";
import { Baby, CalendarCheck, HeartHandshake, Info, Stethoscope } from "lucide-react";

type ScheduleRow = { when: string; what: string; note?: string };

const CHILD_ROWS: ScheduleRow[] = [
  { when: "At birth", what: "BCG, OPV-0, Hepatitis B (birth dose)" },
  { when: "6 weeks", what: "DTP-1, OPV-1, Rotavirus-1, PCV-1, Hepatitis B-2" },
  { when: "9–12 months", what: "Measles / MMR-1, Typhoid conjugate" },
  { when: "16–24 months", what: "DTP booster-1, Measles-2" },
  { when: "5–6 years", what: "DTP booster-2" },
];

const ADULT_ROWS: ScheduleRow[] = [
  { when: "18+", what: "Blood pressure", note: "at least once a year" },
  { when: "35+", what: "HbA1c / fasting blood sugar", note: "yearly if you have risk factors or are overweight (Indian threshold: BMI 23)" },
  { when: "40+", what: "Lipid profile", note: "yearly from 40; earlier if you have risk factors" },
  { when: "Women", what: "Haemoglobin (Hb)", note: "yearly during reproductive age — anaemia is common" },
  { when: "40+", what: "Mammography / breast exam", note: "discuss with your doctor" },
  { when: "30+", what: "Pap smear", note: "discuss with your doctor, per ICMR guidance" },
  { when: "60+", what: "Dental & eye check", note: "once a year" },
];

const PREGNANCY_ROWS: ScheduleRow[] = [
  { when: "First 12 weeks", what: "First ANC visit", note: "within 12 weeks of missing a period — register at the nearest PHC/CHC" },
  { when: "4+ contacts", what: "Minimum 4 ANC contacts", note: "more as advised" },
  { when: "2nd trimester", what: "Iron-Folic Acid daily", note: "per ANM/doctor guidance" },
  { when: "Td", what: "Td (tetanus) doses", note: "per schedule" },
  { when: "After birth", what: "Postnatal checks", note: "day 1, day 3, day 7 and a 6-week visit for mother + newborn" },
];

function RowList({ rows }: { rows: ScheduleRow[] }) {
  return (
    <ul className="mt-2.5">
      {rows.map((r) => (
        <li key={r.when + r.what} className="flex items-start gap-2.5 border-t border-[#EFE9E0]/70 py-2 first:border-t-0">
          <span className="mt-0.5 shrink-0 rounded-full bg-[#9DB89E]/15 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-wider text-[#5A7A5B]">{r.when}</span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#1F1B17]">{r.what}</p>
            {r.note && <p className="mt-0.5 text-[0.7rem] leading-relaxed text-[#5C544D]">{r.note}</p>}
          </div>
        </li>
      ))}
    </ul>
  );
}

export function PreventionSchedule() {
  return (
    <section aria-labelledby="kyh-prevention-title" className="glass-soft rounded-2xl p-5 sm:p-6">
      <h2 id="kyh-prevention-title" className="flex items-center gap-2 font-serif text-base font-semibold tracking-tight text-[#1F1B17]">
        <CalendarCheck className="h-4 w-4 text-[#5A7A5B]" aria-hidden="true" /> Prevention, on schedule
      </h2>
      <p className="mt-1.5 flex items-start gap-1.5 text-[0.65rem] leading-relaxed text-[#9A8F84]">
        <Info className="mt-0.5 h-3 w-3 shrink-0 text-[#B5A99E]" aria-hidden="true" />
        General reference from India&rsquo;s public-health guidelines — your doctor personalises this for you.
      </p>
      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl bg-[#FAF7F2]/60 p-3.5 sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C544D]">
            <Baby className="h-3.5 w-3.5 text-[#B8893D]" aria-hidden="true" /> Child immunization highlights
          </p>
          <p className="mt-0.5 text-[0.6rem] text-[#B5A99E]">India&rsquo;s Universal Immunization Programme — key milestones</p>
          <RowList rows={CHILD_ROWS} />
        </div>
        <div className="rounded-xl bg-[#FAF7F2]/60 p-3.5 sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C544D]">
            <Stethoscope className="h-3.5 w-3.5 text-[#5A7A5B]" aria-hidden="true" /> Adult screening cadence
          </p>
          <p className="mt-0.5 text-[0.6rem] text-[#B5A99E]">Common check-up rhythm for adults in India</p>
          <RowList rows={ADULT_ROWS} />
        </div>
        <div className="rounded-xl bg-[#FAF7F2]/60 p-3.5 sm:p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C544D]">
            <HeartHandshake className="h-3.5 w-3.5 text-[#C98A7A]" aria-hidden="true" /> Pregnancy care (ANC) highlights
          </p>
          <p className="mt-0.5 text-[0.6rem] text-[#B5A99E]">Standard India / WHO guidance for every pregnancy</p>
          <RowList rows={PREGNANCY_ROWS} />
        </div>
      </div>
    </section>
  );
}
