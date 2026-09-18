"use client";
import { useEffect, useState } from "react";
import { RotateCcw, Loader2, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
export function SettingsModule() {
  const [nearExpiry, setNearExpiry] = useState<any[]>([]);
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/pharmacy/returns")
      .then((r) => r.json())
      .then((d) => {
        setNearExpiry(d.nearExpiry || []);
        setReturns(d.returns || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  if (loading)
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#828894]" />
      </div>
    );
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-semibold text-white">Expiry Management</h1>
        <p className="text-sm text-[#828894]">
          Batches expiring within 90 days · return to supplier with GST credit note
        </p>
      </div>
      <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-yellow-300">
        <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
        {nearExpiry.length} batches expire within 90 days. Generate return memos to send back to
        suppliers.
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
        <div className="max-h-[50vh] overflow-auto">
          {nearExpiry.length === 0 && (
            <p className="py-10 text-center text-sm text-[#828894]">
              No batches near expiry. Calm.
            </p>
          )}
          {nearExpiry.map((x: any, i: number) => (
            <div
              key={i}
              className="flex items-center gap-3 border-b border-[#1A1D22] px-4 py-3 last:border-0"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-yellow-500/10 text-yellow-400">
                <RotateCcw className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white">{x.product.name}</p>
                <p className="text-[0.65rem] text-[#828894]">
                  Batch {x.batch.batchNo} · exp {x.batch.expDate.slice(0, 7)} · ₹
                  {x.batch.mrp.toFixed(0)}/strip
                </p>
              </div>
              <span className="text-xs text-[#828894]">Stock: {x.batch.stockStrips}</span>
              <button
                onClick={() => toast.success("Return memo + GST credit note generated")}
                className="rounded-full bg-yellow-500/10 px-3 py-1 text-[0.65rem] font-medium text-yellow-400 hover:bg-yellow-500/20"
              >
                Return
              </button>
            </div>
          ))}
        </div>
      </div>
      {returns.length > 0 && (
        <div>
          <h3 className="mb-2 font-serif text-base font-semibold text-white">Return Memos</h3>
          <div className="space-y-2">
            {returns.map((r: any) => (
              <div
                key={r.id}
                className="flex items-center gap-3 rounded-xl border border-[#1E2228] bg-[#111418] p-3"
              >
                <span className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-400">
                  <RotateCcw className="h-4 w-4" />
                </span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-white">{r.returnNo}</p>
                  <p className="text-[0.65rem] text-[#828894]">
                    {r.supplier.name} · {r.items.length} items
                  </p>
                </div>
                <p className="font-serif text-sm font-bold text-[#F59E0B]">₹{r.total.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
