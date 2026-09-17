"use client";
import { useEffect, useState } from "react";
import { Users, Loader2, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
export function CustomersModule() {
  const [customers, setCustomers] = useState<any[]>([]); const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/pharmacy/customers-accounts").then(r=>r.json()).then(d=>setCustomers(d.customers||[])).catch(()=>{}).finally(()=>setLoading(false)); }, []);
  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#828894]" /></div>;
  const totalOutstanding = customers.reduce((s,c)=>s+c.outstanding,0);
  return (
    <div className="space-y-4">
      <div><h1 className="font-serif text-2xl font-semibold text-white">Customer Accounts</h1><p className="text-sm text-[#828894]">Credit accounts &amp; outstanding · total due ₹{totalOutstanding.toLocaleString("en-IN")}</p></div>
      <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
        <div className="max-h-[65vh] overflow-auto">
          {customers.map(c => (
            <div key={c.id} className="flex flex-wrap items-center gap-3 border-b border-[#1A1D22] px-4 py-3 last:border-0 hover:bg-[#0D0F12]">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1E2228] text-xs font-bold text-[#828894]">{c.name.split(" ").map((x:string)=>x[0]).join("").slice(0,2)}</span>
              <div className="min-w-0 flex-1"><p className="text-sm font-medium text-white">{c.name}</p><p className="text-[0.65rem] text-[#828894]">{c.phone||"No phone"} · {c.sales.length} credit bills</p></div>
              {c.outstanding>0 ? <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-red-400">Due ₹{c.outstanding.toFixed(0)}</span> : <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[0.65rem] font-medium text-green-400">Settled</span>}
              {c.outstanding>0 && <button onClick={()=>toast.success("WhatsApp reminder sent")} className="flex items-center gap-1 rounded-full bg-green-500/10 px-2.5 py-1 text-[0.6rem] font-medium text-green-400 hover:bg-green-500/20"><MessageCircle className="h-3 w-3" />Remind</button>}
            </div>
          ))}
          {customers.length === 0 && <p className="py-10 text-center text-sm text-[#828894]">No customers found.</p>}
        </div>
      </div>
    </div>
  );
}
