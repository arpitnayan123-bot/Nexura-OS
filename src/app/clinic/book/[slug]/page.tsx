"use client";

import { use, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Stethoscope, Clock, CheckCircle2, Loader2, Calendar, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ClinicData = {
  clinic: { id: string; name: string; address: string | null; city: string | null; phone: string | null };
  doctors: { id: string; name: string; specialization: string | null; qualification: string | null; feeConsult: number; shiftStart: string | null; shiftEnd: string | null }[];
};

export default function BookingPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<ClinicData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState<string>("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [booking, setBooking] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    fetch(`/api/clinic/booking?slug=${slug}`).then((r) => r.json()).then((d) => { setData(d); }).catch(() => {}).finally(() => setLoading(false));
  }, [slug]);

  // generate 7 days
  const days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i);
    return { date: d, label: d.toLocaleDateString("en-IN", { weekday: "short" }), day: d.getDate(), month: d.toLocaleDateString("en-IN", { month: "short" }) };
  });

  // generate time slots (9am–5pm, 30-min)
  const slots = Array.from({ length: 16 }).map((_, i) => {
    const h = 9 + Math.floor(i / 2);
    const m = i % 2 === 0 ? "00" : "30";
    return `${String(h).padStart(2, "0")}:${m}`;
  });

  const submit = async () => {
    if (!data || !name || !phone || !selectedSlot) { toast.error("Fill all fields"); return; }
    setBooking(true);
    const day = days[selectedDay];
    const [h, m] = selectedSlot.split(":");
    const slot = new Date(day.date);
    slot.setHours(+h, +m, 0, 0);
    try {
      await fetch("/api/clinic/booking", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ clinicId: data.clinic.id, doctorId: selectedDoctor || undefined, patientName: name, phone, slot: slot.toISOString() }) });
      setDone(true);
      toast.success("Booking confirmed!");
    } catch { toast.error("Booking failed"); } finally { setBooking(false); }
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#FAF7F2]"><Loader2 className="h-6 w-6 animate-spin text-[#D98B6E]" /></div>;
  if (!data) return <div className="grid min-h-screen place-items-center bg-[#FAF7F2] text-sm text-[#9A8F84]">Clinic not found.</div>;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#2A2622]">
      {/* ambient */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#D98B6E]/10 blur-3xl anim-aurora" />
        <div className="absolute bottom-0 -right-32 h-80 w-80 rounded-full bg-[#9DB89E]/10 blur-3xl anim-aurora" style={{ animationDelay: "-8s" }} />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-12">
        {/* clinic header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <Link href="/" className="mb-3 flex items-center gap-1.5 text-xs text-[#9A8F84] hover:text-[#2A2622]"><ArrowLeft className="h-3.5 w-3.5" /> Homepage</Link>
          <h1 className="font-serif text-2xl font-semibold tracking-tight sm:text-3xl">{data.clinic.name}</h1>
          <p className="mt-1 text-sm text-[#9A8F84]">{data.clinic.address}{data.clinic.city ? `, ${data.clinic.city}` : ""} · {data.clinic.phone}</p>
        </motion.div>

        {done ? (
          <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="grid place-items-center rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-[#EFE9E0]">
            <CheckCircle2 className="h-12 w-12 text-[#9DB89E]" />
            <h2 className="mt-3 font-serif text-xl font-semibold">Booking confirmed!</h2>
            <p className="mt-1 text-sm text-[#9A8F84]">{name}, your appointment at {data.clinic.name} is confirmed for {days[selectedDay].label}, {days[selectedDay].day} {days[selectedDay].month} at {selectedSlot}.</p>
            <p className="mt-2 text-xs text-[#9A8F84]">You'll receive a confirmation on {phone}. The clinic will see you in their queue with an &quot;Online&quot; badge.</p>
            <button onClick={() => { setDone(false); setName(""); setPhone(""); setSelectedSlot(""); }} className="mt-5 rounded-full bg-[#2A2622] px-5 py-2 text-xs font-semibold text-white">Book another</button>
          </motion.div>
        ) : (
          <div className="space-y-5">
            {/* doctors */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Choose doctor</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setSelectedDoctor("")} className={cn("rounded-xl border p-3 text-left transition-all", !selectedDoctor ? "border-[#D98B6E] bg-[#D98B6E]/5 shadow-sm" : "border-[#EFE9E0] bg-white hover:border-[#D98B6E]/30")}>
                  <p className="text-sm font-semibold">Any doctor</p>
                  <p className="text-[0.6rem] text-[#9A8F84]">First available</p>
                </button>
                {data.doctors.map((d) => (
                  <button key={d.id} onClick={() => setSelectedDoctor(d.id)} className={cn("rounded-xl border p-3 text-left transition-all", selectedDoctor === d.id ? "border-[#D98B6E] bg-[#D98B6E]/5 shadow-sm" : "border-[#EFE9E0] bg-white hover:border-[#D98B6E]/30")}>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-[0.6rem] text-[#9A8F84]">{d.specialization} · ₹{d.feeConsult}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* day selector */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Select day (next 7 days)</h3>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {days.map((d, i) => (
                  <button key={i} onClick={() => setSelectedDay(i)} className={cn("flex shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 transition-all", selectedDay === i ? "border-[#D98B6E] bg-[#D98B6E] text-white shadow-sm" : "border-[#EFE9E0] bg-white text-[#5C544D]")}>
                    <span className="text-[0.6rem] font-medium">{d.label}</span>
                    <span className="font-serif text-lg font-bold">{d.day}</span>
                    <span className="text-[0.55rem]">{d.month}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* time slots */}
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Available slots</h3>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {slots.map((s) => (
                  <button key={s} onClick={() => setSelectedSlot(s)} className={cn("rounded-lg border py-2 text-xs font-medium transition-all", selectedSlot === s ? "border-[#D98B6E] bg-[#D98B6E] text-white shadow-sm" : "border-[#EFE9E0] bg-white text-[#5C544D] hover:border-[#D98B6E]/30")}>{s}</button>
                ))}
              </div>
            </div>

            {/* patient info */}
            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-[#EFE9E0]">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#9A8F84]">Your details</h3>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-11 w-full rounded-xl bg-[#FAF7F2] px-4 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#D98B6E]/40" />
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Mobile number" type="tel" className="h-11 w-full rounded-xl bg-[#FAF7F2] px-4 text-sm ring-1 ring-[#EFE9E0] outline-none focus:ring-2 focus:ring-[#D98B6E]/40" />
              <button onClick={submit} disabled={booking || !name || !phone || !selectedSlot} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#2A2622] py-3 text-sm font-semibold text-white disabled:opacity-50">
                {booking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calendar className="h-4 w-4" />}
                {selectedSlot ? `Book ${days[selectedDay].label} ${days[selectedDay].day} at ${selectedSlot}` : "Select a slot"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
