"use client";
import { useEffect, useState } from "react";
import { Boxes, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
type Item = { id: string; name: string; genericName: string | null; brand: string | null; schedule: string | null; category: string; stockStrips: number; stockLoose: number; reorderLevel: number; earliestExpiry: string | null; low: boolean; nearExpiry: boolean; batches: { id: string; batchNo: string; expDate: string; mrp: number; stockStrips: number }[] };
export function InventoryModule() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { fetch("/api/pharmacy/inventory").then(r => r.json()).then(d => setItems(d.items || [])).catch(() => {}).finally(() => setLoading(false)); }, []);
  if (loading) return <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#6B7280]" /></div>;
  const low = items.filter(i => i.low).length, exp = items.filter(i => i.nearExpiry).length;
  return (
    <div className="space-y-4">
      <div><h1 className="font-serif text-2xl font-semibold text-white">Inventory</h1><p className="text-sm text-[#6B7280]">{items.length} products · {low} low stock · {exp} near expiry</p></div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[{l:"Products",v:items.length,c:"#F59E0B"},{l:"Low stock",v:low,c:"#EF4444"},{l:"Near expiry",v:exp,c:"#EAB308"},{l:"Total units",v:items.reduce((s,i)=>s+i.stockStrips,0),c:"#22C55E"}].map(k => (
          <div key={k.l} className="rounded-2xl border border-[#1E2228] bg-[#111418] p-4"><span className="h-2 w-2 rounded-full block" style={{background:k.c}} /><p className="mt-1 font-serif text-xl font-bold text-white">{k.v}</p><p className="text-[0.6rem] text-[#6B7280]">{k.l}</p></div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-sm"><thead className="sticky top-0 bg-[#0D0F12]"><tr className="text-left text-[0.6rem] uppercase tracking-wider text-[#6B7280]">
            <th className="p-3 font-medium">Medicine</th><th className="p-3 font-medium">Sch</th><th className="p-3 text-center font-medium">Batches</th><th className="p-3 text-center font-medium">Stock</th><th className="p-3 text-center font-medium">Reorder</th><th className="p-3 text-center font-medium">Expiry</th>
          </tr></thead><tbody>
            {items.map(p => (<tr key={p.id} className="border-b border-[#1A1D22] hover:bg-[#0D0F12]">
              <td className="p-3"><p className="font-medium text-white">{p.name}</p><p className="text-[0.6rem] text-[#6B7280]">{p.genericName} · {p.brand}</p></td>
              <td className="p-3">{p.schedule && p.schedule !== "OTC" && <span className="rounded bg-red-500/15 px-1 py-0.5 text-[0.55rem] font-bold text-red-400">{p.schedule}</span>}</td>
              <td className="p-3 text-center text-white tabular-nums">{p.batches.length}</td>
              <td className="p-3 text-center"><span className={cn("font-medium tabular-nums", p.low ? "text-red-400" : "text-white")}>{p.stockStrips}</span></td>
              <td className="p-3 text-center text-[#6B7280] tabular-nums">{p.reorderLevel}</td>
              <td className="p-3 text-center">{p.nearExpiry ? <span className="flex items-center justify-center gap-1 text-yellow-400"><AlertTriangle className="h-3 w-3" />{p.earliestExpiry?.slice(0,7)}</span> : <span className="text-[#6B7280]">{p.earliestExpiry?.slice(0,7)}</span>}</td>
            </tr>))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}
