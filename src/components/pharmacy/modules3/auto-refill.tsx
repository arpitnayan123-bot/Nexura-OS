"use client";
import { useEffect, useState } from "react";
import { RefreshCw, Loader2, MessageCircle, Pill } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export function AutoRefillModule() {
  const [refills, setRefills] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/pharmacy/auto-refill").then(r => r.json()).then(d => setRefills(d.refills || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#828894]" /></div>;
  return (
    <div className="space-y-4">
      <div><h1 className="font-serif text-2xl font-semibold text-white">Auto-Refill</h1><p className="text-sm text-[#828894]">AI tracks prescriptions → 3 days before run-out → WhatsApp reminder to patient</p></div>
      {refills.length === 0 ? <div className="grid place-items-center rounded-2xl border border-[#1E2228] bg-[#111418] py-16"><RefreshCw className="mb-2 h-10 w-10 text-[#1E2228]" /><p className="text-sm text-[#828894]">No refills due yet.</p></div> :
      <div className="space-y-2">{refills.map((r,i) => (
        <div key={i} className="flex items-center gap-3 rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-[#F59E0B]/10 text-[#F59E0B]"><RefreshCw className="h-4 w-4" /></span>
          <div className="flex-1"><p className="text-sm font-semibold text-white">{r.customer}</p><p className="text-[0.65rem] text-[#828894]">{r.meds.join(", ")} · {r.daysSince}d since last purchase</p></div>
          <button onClick={() => toast.success(`WhatsApp refill reminder sent to ${r.customer}`)} className="flex items-center gap-1 rounded-full bg-[#F59E0B] px-3 py-1 text-[0.65rem] font-bold text-black"><MessageCircle className="h-3 w-3" /> Remind</button>
        </div>))}</div>}
    </div>
  );
}
