"use client";
import { useEffect, useState } from "react";
import { Truck, Loader2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
export function SuppliersModule() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/pharmacy/suppliers")
      .then((r) => r.json())
      .then((d) => setSuppliers(d.suppliers || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#828894]" />
      </div>
    );
  const totalDue = suppliers.reduce((s, x) => s + x.outstanding, 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-white">Suppliers</h1>
        <p className="text-sm text-[#828894]">
          Ledgers &amp; outstanding dues · total due ₹{totalDue.toLocaleString("en-IN")}
        </p>
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
        <div className="max-h-[65vh] overflow-auto">
          {suppliers.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center gap-3 border-b border-[#1A1D22] px-4 py-3 last:border-0 hover:bg-[#0D0F12]"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-green-500/10 text-green-400">
                <Truck className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{s.name}</p>
                <p className="text-[0.65rem] text-[#828894]">
                  {s.gstin || "No GSTIN"} · {s.purchases.length} purchases
                </p>
              </div>
              <div className="text-right">
                <p className="font-serif text-sm font-bold text-[#F59E0B]">
                  ₹{s.totalPurchased.toLocaleString("en-IN")}
                </p>
                {s.outstanding > 0 ? (
                  <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-[0.6rem] font-medium text-red-400">
                    Due ₹{s.outstanding.toFixed(0)}
                  </span>
                ) : (
                  <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[0.6rem] font-medium text-green-400">
                    Settled
                  </span>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-[#828894]" />
            </div>
          ))}
          {suppliers.length === 0 && (
            <p className="py-10 text-center text-sm text-[#828894]">No suppliers found.</p>
          )}
        </div>
      </div>
    </div>
  );
}
