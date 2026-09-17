"use client";
import { useEffect, useState } from "react";
import { BarChart3, Loader2, Search, Sparkles, Wallet, TrendingUp, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export function ReportsModule() {
  const [data, setData] = useState<any>(null); const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState(""); const [answer, setAnswer] = useState<any>(null); const [aiLoading, setAiLoading] = useState(false);
  useEffect(() => { fetch("/api/pharmacy/day-closing").then(r=>r.json()).then(d=>setData(d)).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  const runQuery = async () => {
    if (!query.trim()) return; setAiLoading(true); setAnswer(null);
    try {
      const res = await fetch("/api/pharmacy/ai-query", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query }) });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setAnswer({ query: d.query ?? query, text: d.text ?? "No data found" });
      toast.success("AI query answered");
    } catch { toast.error("Could not process query"); } finally { setAiLoading(false); }
  };
  if (loading || !data) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#828894]" /></div>;
  return (
    <div className="space-y-5">
      <div><h1 className="font-serif text-2xl font-semibold text-white">Reports &amp; Business Intelligence</h1><p className="text-sm text-[#828894]">Day closing, GSTR-1, BI dashboard &amp; AI Query</p></div>
      {/* AI Query Bar */}
      <div className="rounded-2xl border border-[#F59E0B]/20 bg-[#F59E0B]/5 p-4">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]"><Sparkles className="h-3.5 w-3.5" />AI Query Bar — ask anything in natural language</p>
        <div className="flex gap-2">
          <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#828894]" /><input value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>e.key==="Enter"&&runQuery()} placeholder="e.g. which medicines are expiring in 60 days?" className="h-10 w-full rounded-lg border border-[#1E2228] bg-[#0D0F12] pl-10 pr-3 text-sm text-white outline-none focus:border-[#F59E0B]/50" /></div>
          <button onClick={runQuery} disabled={aiLoading} className="flex items-center gap-1.5 rounded-lg bg-[#F59E0B] px-4 py-2 text-xs font-bold text-black disabled:opacity-50">{aiLoading?<Loader2 className="h-3.5 w-3.5 animate-spin" />:"Ask AI"}</button>
        </div>
        {answer && <div className="mt-3 rounded-lg bg-[#0D0F12] p-3"><p className="text-[0.6rem] text-[#828894]">Query: {answer.query}</p><p className="mt-1 text-sm text-white">{answer.text}</p></div>}
      </div>
      {/* Day closing summary */}
      <div><h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#828894]">Day Closing Summary</h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Cash" value={`₹${data.cashSales.toLocaleString("en-IN")}`} color="#22C55E" />
          <Kpi label="UPI" value={`₹${data.upiSales.toLocaleString("en-IN")}`} color="#3B82F6" />
          <Kpi label="Card" value={`₹${data.cardSales.toLocaleString("en-IN")}`} color="#F59E0B" />
          <Kpi label="Credit" value={`₹${data.creditSales.toLocaleString("en-IN")}`} color="#EF4444" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Total Sales" value={`₹${data.totalSales.toLocaleString("en-IN")}`} sub={`${data.invoiceCount} invoices`} color="#F59E0B" />
        <Kpi label="CGST" value={`₹${data.cgstCollected.toFixed(2)}`} color="#9DB89E" />
        <Kpi label="SGST" value={`₹${data.sgstCollected.toFixed(2)}`} color="#C9962E" />
        <Kpi label="Net Profit" value={`₹${(data.totalSales-data.totalDiscount).toLocaleString("en-IN")}`} color="#22C55E" />
      </div>
      <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-5">
        <div className="mb-3 flex items-center justify-between"><h3 className="font-serif text-base font-semibold text-white">GST Collected</h3><button onClick={()=>toast.info("Exporting GSTR-1…")} className="flex items-center gap-1.5 rounded-full bg-[#1E2228] px-3 py-1.5 text-xs font-medium text-[#F59E0B] hover:bg-[#2A2E35]"><Download className="h-3 w-3" />GSTR-1</button></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center"><p className="text-xs text-[#828894]">CGST</p><p className="font-serif text-xl font-bold text-white">₹{data.cgstCollected.toFixed(2)}</p></div>
          <div className="text-center"><p className="text-xs text-[#828894]">SGST</p><p className="font-serif text-xl font-bold text-white">₹{data.sgstCollected.toFixed(2)}</p></div>
          <div className="border-l border-[#1E2228] text-center"><p className="text-xs text-[#828894]">Total GST</p><p className="font-serif text-xl font-bold text-[#F59E0B]">₹{data.totalGst.toFixed(2)}</p></div>
        </div>
      </div>
    </div>
  );
}
function Kpi({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) {
  return <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-4"><span className="h-2 w-2 rounded-full block" style={{background:color}} /><p className="mt-1 font-serif text-xl font-bold text-white">{value}</p><p className="text-xs text-[#828894]">{label}</p>{sub && <p className="text-[0.6rem] text-[#828894]">{sub}</p>}</div>;
}
