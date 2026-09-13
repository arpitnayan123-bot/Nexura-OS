"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft, ShieldCheck, BadgeCheck, Star, MapPin, Plane,
  Stethoscope, IndianRupee, ArrowRight, MessageCircle, Loader2,
  Users, FileText, Phone, Mail, Globe,
} from "lucide-react";
import { toast } from "sonner";

type Doctor = { id: string; name: string; specialty: string; regNo: string | null; department: string | null };
type Procedure = { id: string; name: string; category: string; priceUSD: number; avgStayDays: number };
type Testimonial = { id: string; patientName: string; patientCountry: string; procedure: string; rating: number; testimonial: string; treatmentDate: string | null };
type HospitalData = {
  hospital: {
    id: string; name: string; address: string | null; district: string | null;
    state: string | null; pincode: string | null; contact: string | null;
    nabhAccredited: boolean;
  };
  settings: {
    tourismReady: boolean; nabhCertUrl: string | null; jciCertUrl: string | null;
    internationalPhone: string | null; internationalEmail: string | null;
    rating: number; languages: string | null;
  } | null;
  procedures: Procedure[];
  doctors: Doctor[];
  testimonials: Testimonial[];
};

const COST_COMPARISON: Record<string, { usa: number; uk: number; uae: number }> = {
  "Coronary Artery Bypass Graft (CABG)": { usa: 130000, uk: 45000, uae: 25000 },
  "Heart Valve Replacement": { usa: 170000, uk: 55000, uae: 32000 },
  "Total Hip Replacement": { usa: 40000, uk: 18000, uae: 15000 },
  "Total Knee Replacement": { usa: 35000, uk: 16000, uae: 14000 },
  "IVF Treatment (1 cycle)": { usa: 15000, uk: 8000, uae: 6000 },
  "Dental Implants (per tooth)": { usa: 5000, uk: 3000, uae: 2000 },
  "Brain Tumor Surgery": { usa: 150000, uk: 60000, uae: 35000 },
  "Kidney Transplant": { usa: 400000, uk: 100000, uae: 60000 },
  "Liver Transplant": { usa: 575000, uk: 200000, uae: 120000 },
  "Gastric Bypass Surgery": { usa: 25000, uk: 12000, uae: 9000 },
  "Breast Cancer Surgery": { usa: 20000, uk: 10000, uae: 8000 },
};

const NAVY = "#0F172A";
const NAVY_2 = "#1E293B";
const GOLD = "#A16207";

export function HospitalProfile() {
  const params = useParams();
  const router = useRouter();
  const hospitalId = params?.id as string;
  const [data, setData] = useState<HospitalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showInquiry, setShowInquiry] = useState(false);
  const [inquiryForm, setInquiryForm] = useState({ name: "", email: "", phone: "", country: "", procedure: "", condition: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!hospitalId) return;
    fetch(`/api/global?action=hospital_detail&hospitalId=${hospitalId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => toast.error("Failed to load hospital"))
      .finally(() => setLoading(false));
  }, [hospitalId]);

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: GOLD }} />
      </div>
    );
  }

  if (!data || !data.hospital) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F8FAFC]">
        <div className="text-center">
          <p className="text-lg font-semibold text-slate-900">Hospital not found</p>
          <Link href="/global" className="mt-2 text-sm text-blue-600 hover:underline">← Back to discovery</Link>
        </div>
      </div>
    );
  }

  const { hospital, settings, procedures, doctors, testimonials } = data;
  const rating = settings?.rating ?? 4.5;
  const hasNABH = settings?.nabhCertUrl || hospital.nabhAccredited;
  const hasJCI = settings?.jciCertUrl;
  const city = hospital.district || hospital.state || "India";

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Top nav */}
      <nav className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/global" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="mx-auto flex items-center gap-2">
            <Globe className="h-5 w-5" style={{ color: NAVY }} />
            <span className="font-display text-sm font-bold" style={{ color: NAVY }}>Nexura Global</span>
          </div>
          <button onClick={() => router.push("/global/dashboard")} className="text-xs font-medium text-slate-500 hover:text-slate-900">
            Coordinator Login
          </button>
        </div>
      </nav>

      {/* Hero header */}
      <header className="relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: `radial-gradient(circle at 20% 50%, ${GOLD} 0%, transparent 50%)` }} />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10 backdrop-blur">
                  <Stethoscope className="h-7 w-7 text-white" />
                </span>
                <div>
                  <h1 className="font-display text-2xl font-bold text-white sm:text-3xl">{hospital.name}</h1>
                  <div className="mt-1 flex items-center gap-2 text-sm text-white/60">
                    <MapPin className="h-3.5 w-3.5" /> {city}, {hospital.state || "India"}
                  </div>
                </div>
              </div>
              {/* Badges */}
              <div className="mt-4 flex flex-wrap gap-2">
                {hasNABH && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                    <ShieldCheck className="h-3.5 w-3.5" /> NABH Accredited
                  </span>
                )}
                {hasJCI && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-400">
                    <BadgeCheck className="h-3.5 w-3.5" /> JCI Accredited
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs font-medium text-white/80">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {rating.toFixed(1)} Rating
                </span>
              </div>
            </div>
            {/* CTA buttons */}
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                onClick={() => setShowInquiry(true)}
                className="flex items-center gap-2 rounded-xl bg-amber-500 px-5 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-600"
              >
                <FileText className="h-4 w-4" /> Get Free Cost Estimate
              </button>
              <button
                onClick={() => toast.success("Pre-travel video consultation request sent! The coordinator will contact you within 24 hours.")}
                className="flex items-center gap-2 rounded-xl bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur transition-all hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" /> Book Video Consultation
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {/* Procedures + Cost Comparison */}
        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Procedures & Pricing</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Procedure list */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold text-slate-700">All Procedures (USD)</h3>
              <div className="space-y-2">
                {procedures.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="flex items-center justify-between border-b border-slate-100 pb-2 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">{p.name}</p>
                      <p className="text-[0.65rem] text-slate-400">Avg stay: {p.avgStayDays} days</p>
                    </div>
                    <span className="font-display text-base font-bold" style={{ color: NAVY }}>
                      ${p.priceUSD.toLocaleString()}
                    </span>
                  </motion.div>
                ))}
                {procedures.length === 0 && <p className="text-sm text-slate-400">No procedures listed</p>}
              </div>
            </div>

            {/* Cost comparison for first procedure */}
            {procedures[0] && COST_COMPARISON[procedures[0].name] && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Cost Comparison: {procedures[0].name}
                </h3>
                <div className="space-y-3">
                  {[
                    { label: "This Hospital (India)", cost: procedures[0].priceUSD, color: "#22C55E", highlight: true },
                    { label: "USA Average", cost: COST_COMPARISON[procedures[0].name].usa, color: "#EF4444" },
                    { label: "UK Average", cost: COST_COMPARISON[procedures[0].name].uk, color: "#A16207" },
                    { label: "UAE Average", cost: COST_COMPARISON[procedures[0].name].uae, color: "#8B5CF6" },
                  ].map((row) => (
                    <div key={row.label} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className={row.highlight ? "font-bold text-green-600" : "text-slate-600"}>{row.label}</span>
                          <span className={row.highlight ? "font-bold text-green-600" : "font-semibold text-slate-800"}>${row.cost.toLocaleString()}</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full" style={{ width: `${Math.min((row.cost / COST_COMPARISON[procedures[0].name].usa) * 100, 100)}%`, background: row.color }} />
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="mt-2 rounded-lg bg-green-50 p-3 text-center">
                    <p className="text-xs text-green-600">
                      You save <span className="font-bold">${(COST_COMPARISON[procedures[0].name].usa - procedures[0].priceUSD).toLocaleString()}</span> vs USA
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Surgeons */}
        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Our Surgeons & Specialists</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {doctors.map((doc, i) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-11 w-11 place-items-center rounded-full text-xs font-bold text-white" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}>
                    {doc.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                  <div>
                    <p className="text-sm font-bold text-slate-900">{doc.name}</p>
                    <p className="text-xs text-slate-500">{doc.specialty}</p>
                    {doc.regNo && <p className="text-[0.6rem] text-slate-400">Reg: {doc.regNo}</p>}
                  </div>
                </div>
                {doc.department && <p className="mt-2 text-[0.65rem] text-slate-400">Department: {doc.department}</p>}
              </motion.div>
            ))}
            {doctors.length === 0 && <p className="text-sm text-slate-400">No surgeon profiles available</p>}
          </div>
        </section>

        {/* How to Reach */}
        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-900">How to Reach Us</h2>
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Address</p>
                  <p className="text-xs text-slate-500">{hospital.address || city}, {hospital.state}, {hospital.pincode || ""}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
                  <Plane className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-slate-800">Nearest Airport</p>
                  <p className="text-xs text-slate-500">{city} International Airport</p>
                </div>
              </div>
              {settings?.internationalPhone && (
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-green-50 text-green-600">
                    <Phone className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">International Desk</p>
                    <p className="text-xs text-slate-500">{settings.internationalPhone}</p>
                  </div>
                </div>
              )}
              {settings?.internationalEmail && (
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
                    <Mail className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Email</p>
                    <p className="text-xs text-slate-500">{settings.internationalEmail}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Patient Reviews */}
        <section className="mb-10">
          <h2 className="mb-4 font-display text-xl font-bold text-slate-900">Patient Reviews</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">
                    {t.patientName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-slate-900">{t.patientName}</p>
                    <p className="text-[0.65rem] text-slate-400">{t.patientCountry} · {t.procedure}</p>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star key={j} className={j < t.rating ? "h-3.5 w-3.5 fill-amber-400 text-amber-400" : "h-3.5 w-3.5 text-slate-300"} />
                    ))}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">"{t.testimonial}"</p>
                {t.treatmentDate && <p className="mt-2 text-[0.6rem] text-slate-400">Treated: {t.treatmentDate}</p>}
              </motion.div>
            ))}
            {testimonials.length === 0 && <p className="text-sm text-slate-400">No reviews yet</p>}
          </div>
        </section>

        {/* Final CTA */}
        <div className="rounded-2xl p-8 text-center" style={{ background: `linear-gradient(135deg, ${NAVY}, ${NAVY_2})` }}>
          <h2 className="font-display text-xl font-bold text-white">Ready to start your journey?</h2>
          <p className="mt-1 text-sm text-white/60">Get a free cost estimate within 24 hours</p>
          <button
            onClick={() => setShowInquiry(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white shadow-lg transition-all hover:bg-amber-600"
          >
            <FileText className="h-4 w-4" /> Get Free Cost Estimate
          </button>
        </div>
      </main>

      {/* Inquiry Modal */}
      {showInquiry && (
        <InquiryModal
          hospitalName={hospital.name}
          hospitalId={hospital.id}
          procedures={procedures.map((p) => p.name)}
          form={inquiryForm}
          setForm={setInquiryForm}
          onSubmit={async () => {
            setSubmitting(true);
            try {
              const res = await fetch("/api/global", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "submit_inquiry",
                  hospitalId: hospital.id,
                  name: inquiryForm.name,
                  email: inquiryForm.email,
                  phone: inquiryForm.phone,
                  country: inquiryForm.country,
                  procedure: inquiryForm.procedure,
                  condition: inquiryForm.condition,
                }),
              });
              const d = await res.json();
              if (d.success) {
                toast.success(d.message || "Inquiry submitted! We'll contact you within 24 hours.");
                setShowInquiry(false);
              } else {
                toast.error("Failed to submit inquiry");
              }
            } catch {
              toast.error("Network error");
            } finally {
              setSubmitting(false);
            }
          }}
          submitting={submitting}
          onClose={() => setShowInquiry(false)}
        />
      )}
    </div>
  );
}

function InquiryModal({
  hospitalName, hospitalId, procedures, form, setForm, onSubmit, submitting, onClose,
}: {
  hospitalName: string;
  hospitalId: string;
  procedures: string[];
  form: any;
  setForm: (f: any) => void;
  onSubmit: () => void;
  submitting: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-lg font-bold text-slate-900">Get Free Cost Estimate</h3>
        <p className="text-xs text-slate-500">{hospitalName} — We'll respond within 24 hours</p>
        <div className="mt-4 space-y-3">
          <Input label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Your name" />
          <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="you@email.com" />
          <Input label="WhatsApp Number" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} placeholder="+971-50-1234567" />
          <Input label="Country of Residence" value={form.country} onChange={(v) => setForm({ ...form, country: v })} placeholder="e.g. United Arab Emirates" />
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Procedure of Interest</label>
            <select
              value={form.procedure}
              onChange={(e) => setForm({ ...form, procedure: e.target.value })}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
            >
              <option value="">Select procedure…</option>
              {procedures.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">Describe Your Condition</label>
            <textarea
              value={form.condition}
              onChange={(e) => setForm({ ...form, condition: e.target.value })}
              rows={3}
              placeholder="Briefly describe your medical condition…"
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
            />
          </div>
        </div>
        <button
          onClick={onSubmit}
          disabled={submitting || !form.name || !form.email}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-bold text-white transition-all hover:bg-amber-600 disabled:opacity-40"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
          {submitting ? "Submitting…" : "Submit Inquiry"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-center text-xs text-slate-400 hover:text-slate-600">Cancel</button>
      </motion.div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold text-slate-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-amber-400"
      />
    </div>
  );
}
