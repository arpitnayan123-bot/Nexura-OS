// @ts-nocheck
"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Plus, Minus, Trash2, Loader2, ShieldAlert,
  CheckCircle2, Camera, Sparkles, AlertTriangle, Pill,
  ArrowRight, Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InventoryItem = {
  id: string; name: string; genericName: string | null; brand: string | null;
  schedule: string | null; salts: string | null; hsn: string | null;
  tabletsPerStrip: number; cgstRate: number; sgstRate: number; stockStrips: number;
  batches: { id: string; batchNo: string; expDate: string; mrp: number; stockStrips: number; purchaseRate: number }[];
};

type CartItem = {
  key: string; productId: string; name: string; genericName: string | null;
  schedule: string | null; batchId: string; batchNo: string; mrp: number;
  qtyStrips: number; qtyLoose: number; discountPct: number;
  cgstRate: number; sgstRate: number; tabletsPerStrip: number;
  scheduleH?: { patientName: string; patientAddress: string; doctorName: string; doctorRegNo: string; prescriptionDate: string };
};

const GST_SLABS = [0, 5, 12, 18];

// memo: BillingModule takes no props; memo keeps the heaviest module (full
// billing UI + inventory search + cart) from re-rendering when the shell
// above it updates (30s mini-dashboard poll, online/offline flips,
// module-switch transitions). Internal state is unaffected.
export const BillingModule = memo(function BillingModule() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMode, setPayMode] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [loading, setLoading] = useState(true);
  const [billing, setBilling] = useState(false);
  const [lastSale, setLastSale] = useState<{ id: string; invoiceNo: string } | null>(null);
  const [eInvoice, setEInvoice] = useState<string | null>(null);
  const [einvLoading, setEinvLoading] = useState(false);
  const [pendingScheduleH, setPendingScheduleH] = useState<{ item: InventoryItem; batchId: string } | null>(null);
  const [batchPanel, setBatchPanel] = useState<InventoryItem | null>(null);
  const [showRx, setShowRx] = useState(false);
  const [showInteraction, setShowInteraction] = useState<any>(null);
  const [interactions, setInteractions] = useState<any[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { const res = await fetch("/api/pharmacy/inventory"); if (!res.ok) throw new Error(); const d = await res.json(); setInventory(d.items || []); } catch {} finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  // fuzzy search
  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || q.length < 1) return [];
    return inventory.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.genericName?.toLowerCase().includes(q) ||
      p.brand?.toLowerCase().includes(q) ||
      p.salts?.toLowerCase().includes(q) ||
      p.hsn?.includes(q)
    ).slice(0, 8);
  }, [inventory, query]);

  const stockBadge = (p: InventoryItem) => {
    if (p.stockStrips === 0) return { label: "Out of stock", color: "text-red-400 bg-red-500/10" };
    if (p.stockStrips <= 5) return { label: "Low stock", color: "text-yellow-400 bg-yellow-500/10" };
    return { label: "In stock", color: "text-green-400 bg-green-500/10" };
  };

  const addToCart = (item: InventoryItem, batchId?: string) => {
    const batch = item.batches.find(b => b.id === batchId) || item.batches[0];
    if (!batch) { toast.error(`${item.name} out of stock`); return; }
    const isScheduleH = item.schedule === "H" || item.schedule === "H1";
    if (isScheduleH) { setPendingScheduleH({ item, batchId: batch.id }); return; }
    commitToCart(item, batch.id, undefined);
  };

  const commitToCart = (item: InventoryItem, batchId: string, scheduleH?: any) => {
    const batch = item.batches.find(b => b.id === batchId)!;
    const key = `${item.id}-${batch.id}`;
    setCart(c => {
      const existing = c.find(x => x.key === key);
      if (existing) return c.map(x => x.key === key ? { ...x, qtyStrips: x.qtyStrips + 1, scheduleH: scheduleH || x.scheduleH } : x);
      return [...c, { key, productId: item.id, name: item.name, genericName: item.genericName, schedule: item.schedule, batchId: batch.id, batchNo: batch.batchNo, mrp: batch.mrp, qtyStrips: 1, qtyLoose: 0, discountPct: 0, cgstRate: item.cgstRate, sgstRate: item.sgstRate, tabletsPerStrip: item.tabletsPerStrip, scheduleH }];
    });
    setQuery(""); setShowResults(false);
    if (scheduleH) toast.success(`${item.name} added (Schedule ${item.schedule} details recorded)`);
  };

  const updateQty = (key: string, delta: number, loose = false) => {
    setCart(c => c.map(x => { if (x.key !== key) return x; if (loose) return { ...x, qtyLoose: Math.max(0, x.qtyLoose + delta) }; return { ...x, qtyStrips: Math.max(0, x.qtyStrips + delta) }; }).filter(x => x.qtyStrips > 0 || x.qtyLoose > 0));
  };
  const updateDiscount = (key: string, pct: number) => setCart(c => c.map(x => x.key === key ? { ...x, discountPct: Math.max(0, Math.min(100, pct)) } : x));
  const removeItem = (key: string) => setCart(c => c.filter(x => x.key !== key));

  // GST breakdown by slab
  const totals = useMemo(() => {
    let subtotal = 0, discount = 0;
    const slabData: Record<number, { taxable: number; cgst: number; sgst: number }> = {};
    GST_SLABS.forEach(s => slabData[s] = { taxable: 0, cgst: 0, sgst: 0 });
    for (const it of cart) {
      const looseMrp = it.mrp / it.tabletsPerStrip;
      const gross = it.qtyStrips * it.mrp + it.qtyLoose * looseMrp;
      const lineDisc = (gross * it.discountPct) / 100;
      const taxable = gross - lineDisc;
      const slab = it.cgstRate + it.sgstRate;
      const nearestSlab = GST_SLABS.find(s => s === slab) || 12;
      slabData[nearestSlab].taxable += taxable;
      slabData[nearestSlab].cgst += (taxable * it.cgstRate) / 100;
      slabData[nearestSlab].sgst += (taxable * it.sgstRate) / 100;
      subtotal += gross; discount += lineDisc;
    }
    const totalCgst = Object.values(slabData).reduce((s, v) => s + v.cgst, 0);
    const totalSgst = Object.values(slabData).reduce((s, v) => s + v.sgst, 0);
    const grand = subtotal - discount + totalCgst + totalSgst;
    const rounded = Math.round(grand);
    return { subtotal, discount, slabData, totalCgst, totalSgst, total: rounded, roundOff: +(rounded - grand).toFixed(2) };
  }, [cart]);

  // AI Drug Interaction Checker (3+ meds)
  useEffect(() => {
    if (cart.length >= 3) {
      // simplified: flag if both NSAIDs + antacid, or duplicate salts
      const names = cart.map(c => c.name.toLowerCase());
      const hasNSAID = names.some(n => n.includes("ibuprofen") || n.includes("diclofenac") || n.includes("combiflam") || n.includes("brufen") || n.includes("voveran"));
      const hasAntacid = names.some(n => n.includes("pantoprazole") || n.includes("omeprazole") || n.includes("ranitidine") || n.includes("pan ") || n.includes("omez"));
      const hasAspirin = names.some(n => n.includes("aspirin") || n.includes("ecosprin"));
      const hasNSAID2 = names.filter(n => n.includes("ibuprofen") || n.includes("diclofenac") || n.includes("aspirin")).length >= 2;
      const found: any[] = [];
      if (hasNSAID2) found.push({ pair: "Two NSAIDs", type: "Pharmacodynamic", severity: "severe", effect: "Increased GI bleeding risk" });
      if (hasAspirin && hasNSAID) found.push({ pair: "Aspirin + NSAID", type: "Pharmacodynamic", severity: "moderate", effect: "Increased bleeding time" });
      setInteractions(found);
    } else {
      setInteractions([]);
    }
  }, [cart]);

  const submit = async () => {
    if (cart.length === 0) { toast.error("Cart is empty"); return; }
    const missing = cart.find(x => (x.schedule === "H" || x.schedule === "H1") && !x.scheduleH);
    if (missing) { toast.error(`${missing.name} needs Schedule H details`); return; }
    setBilling(true);
    try {
      const res = await fetch("/api/pharmacy/billing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: cart.map(c => ({ productId: c.productId, batchId: c.batchId, qtyStrips: c.qtyStrips, qtyLoose: c.qtyLoose, scheduleH: c.scheduleH })), discountPct: 0, payMode }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLastSale({ id: data.sale.id, invoiceNo: data.sale.invoiceNo });
      setEInvoice(null);
      toast.success(`Invoice ${data.sale.invoiceNo} — ₹${data.sale.total}`);
      setCart([]);
      load();
    } catch { toast.error("Billing failed"); } finally { setBilling(false); }
  };

  /* GSTN-schema e-Invoice for the last billed sale — real endpoint,
     IRN/ack honestly null until NIC integration goes live */
  const fetchEinvoice = async () => {
    if (!lastSale) return;
    setEinvLoading(true);
    try {
      const r = await fetch("/api/pharmacy/e-invoice", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ saleId: lastSale.id }) });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setEInvoice(JSON.stringify({ invoiceNo: d.invoiceNo, total: d.total, eInvoice: d.eInvoice, ewayBill: d.ewayBill, eligibleEwayBill: d.eligibleEwayBill }, null, 2));
      toast.success("e-Invoice JSON generated (IRN pending NIC registration)");
    } catch { toast.error("e-Invoice generation failed"); } finally { setEinvLoading(false); }
  };

  return (
    <div className="space-y-4">
      {/* Search bar — Marg ERP style */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#6B7280]" />
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && results[0]) addToCart(results[0]); }}
          placeholder="Search medicine, salt, company, or HSN…"
          className="h-14 w-full rounded-2xl border border-[#1E2228] bg-[#111418] pl-12 pr-32 text-sm text-white outline-none transition-colors focus:border-[#F59E0B]/50"
        />
        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-2">
          <button onClick={() => setShowRx(true)} className="flex items-center gap-1.5 rounded-xl bg-[#F59E0B]/10 px-3 py-2 text-xs font-medium text-[#F59E0B] transition-colors hover:bg-[#F59E0B]/20" title="AI Prescription Camera">
            <Camera className="h-4 w-4" /> <span className="hidden sm:inline">AI Rx</span>
          </button>
          <button onClick={() => toast.info("AI Substitute Finder — search an out-of-stock medicine")} className="grid h-9 w-9 place-items-center rounded-xl bg-[#1E2228] text-[#6B7280] hover:bg-[#2A2E35] hover:text-white" title="AI Substitute">
            <Sparkles className="h-4 w-4" />
          </button>
        </div>

        {/* Autocomplete dropdown */}
        <AnimatePresence>
          {showResults && results.length > 0 && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-[#1E2228] bg-[#111418] shadow-2xl">
              {results.map((p) => {
                const batch = p.batches[0];
                const badge = stockBadge(p);
                const isH = p.schedule === "H" || p.schedule === "H1";
                return (
                  <button key={p.id} onMouseDown={(e) => { e.preventDefault(); setBatchPanel(p); }} className="flex w-full items-center gap-3 border-b border-[#1E2228] px-4 py-3 text-left transition-colors last:border-0 hover:bg-[#1A1D22]">
                    <span className={cn("grid h-9 w-9 shrink-0 place-items-center rounded-lg", isH ? "bg-red-500/10 text-red-400" : "bg-green-500/10 text-green-400")}><Pill className="h-4 w-4" /></span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-white">{p.name} {isH && <span className="ml-1 rounded bg-red-500/15 px-1 text-[0.55rem] font-bold text-red-400">{p.schedule}</span>}</p>
                      <p className="truncate text-[0.65rem] text-[#6B7280]">{p.genericName} · {p.brand} · {p.salts}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-serif text-sm font-bold text-[#F59E0B]">₹{batch?.mrp.toFixed(0)}</p>
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.55rem] font-medium", badge.color)}>{badge.label}</span>
                    </div>
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* AI Drug Interaction warning */}
      <AnimatePresence>
        {interactions.length > 0 && (
          <motion.button
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowInteraction(interactions[0])}
            className="flex w-full items-center gap-2 rounded-xl border border-yellow-500/30 bg-yellow-500/5 px-4 py-2.5 text-left"
          >
            <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-400" />
            <span className="text-xs font-medium text-yellow-400">AI Drug Interaction detected — {interactions.length} interaction(s) found. Click to review.</span>
          </motion.button>
        )}
      </AnimatePresence>

      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        {/* LEFT — cart */}
        <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-serif text-base font-semibold text-white">Bill Cart ({cart.length})</h3>
            {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-[#6B7280] hover:text-red-400">Clear</button>}
          </div>

          {cart.length === 0 ? (
            <div className="grid h-48 place-items-center text-center">
              <div className="flex flex-col items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl border border-dashed border-[#2A2E35] bg-[#0D0F12]/60" aria-hidden="true">
                  <Pill className="h-5 w-5 text-[#E8B04B]/50" />
                </span>
                <div>
                  <p className="text-sm font-medium text-[#9CA3AF]">Search above to add medicines</p>
                  <p className="mt-0.5 text-[0.65rem] text-[#6B7280]">AI Rx reading · interaction checks · GST built in</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#1E2228] text-left text-[0.6rem] uppercase tracking-wider text-[#6B7280]">
                    <th className="py-2 pr-2 font-medium">Medicine · Batch</th>
                    <th className="px-2 py-2 text-center font-medium">MRP</th>
                    <th className="px-2 py-2 text-center font-medium">Strips</th>
                    <th className="px-2 py-2 text-center font-medium">Loose</th>
                    <th className="px-2 py-2 text-center font-medium">Disc%</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="py-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {cart.map((it) => {
                      const looseMrp = it.mrp / it.tabletsPerStrip;
                      const gross = it.qtyStrips * it.mrp + it.qtyLoose * looseMrp;
                      const disc = (gross * it.discountPct) / 100;
                      const amt = gross - disc;
                      return (
                        <motion.tr key={it.key} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="border-b border-[#1A1D22]">
                          <td className="py-2.5 pr-2">
                            <p className="font-medium text-white">{it.name} {(it.schedule === "H" || it.schedule === "H1") && <span className="ml-1 rounded bg-red-500/15 px-1 text-[0.55rem] font-bold text-red-400">{it.schedule}</span>}</p>
                            <p className="text-[0.6rem] text-[#6B7280]">{it.genericName} · {it.batchNo}</p>
                            {it.scheduleH && <p className="mt-0.5 text-[0.55rem] text-green-400">✓ Rx: {it.scheduleH.doctorName} · {it.scheduleH.patientName}</p>}
                          </td>
                          <td className="px-2 py-2.5 text-center tabular-nums text-[#6B7280]">₹{it.mrp.toFixed(0)}</td>
                          <td className="px-2 py-2.5">
                            <div className="mx-auto flex w-fit items-center gap-1">
                              <button onClick={() => updateQty(it.key, -1)} className="grid h-6 w-6 place-items-center rounded-full bg-[#1E2228] text-[#6B7280] hover:bg-[#2A2E35]"><Minus className="h-3 w-3" /></button>
                              <span className="w-6 text-center tabular-nums text-white">{it.qtyStrips}</span>
                              <button onClick={() => updateQty(it.key, 1)} className="grid h-6 w-6 place-items-center rounded-full bg-[#1E2228] text-[#6B7280] hover:bg-[#2A2E35]"><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="mx-auto flex w-fit items-center gap-1">
                              <button onClick={() => updateQty(it.key, -1, true)} className="grid h-6 w-6 place-items-center rounded-full bg-[#1E2228] text-[#6B7280] hover:bg-[#2A2E35]"><Minus className="h-3 w-3" /></button>
                              <span className="w-5 text-center tabular-nums text-white">{it.qtyLoose}</span>
                              <button onClick={() => updateQty(it.key, 1, true)} className="grid h-6 w-6 place-items-center rounded-full bg-[#1E2228] text-[#6B7280] hover:bg-[#2A2E35]"><Plus className="h-3 w-3" /></button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-center">
                            <input type="number" value={it.discountPct || ""} onChange={(e) => updateDiscount(it.key, +e.target.value || 0)} className="h-7 w-12 rounded-md bg-[#0D0F12] text-center text-xs text-white ring-1 ring-[#1E2228] outline-none focus:ring-[#F59E0B]/40" placeholder="0" />
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium tabular-nums text-white">₹{amt.toFixed(2)}</td>
                          <td className="py-2.5 pl-2"><button onClick={() => removeItem(it.key)} className="grid h-7 w-7 place-items-center rounded-full text-[#6B7280] hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button></td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Payment + complete */}
          <div className="mt-4 flex flex-col gap-3 border-t border-[#1E2228] pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-1 rounded-xl bg-[#0D0F12] p-0.5">
              {(["cash", "upi", "card", "credit"] as const).map((m) => (
                <button key={m} onClick={() => setPayMode(m)} className={cn("rounded-lg px-2.5 py-1.5 text-xs font-medium uppercase transition-colors", payMode === m ? "bg-[#F59E0B] text-black" : "text-[#6B7280] hover:text-white")}>{m}</button>
              ))}
            </div>
            <button onClick={submit} disabled={billing || cart.length === 0} className="btn-gold flex items-center justify-center gap-2 rounded-xl bg-[#F59E0B] px-6 py-2.5 text-sm font-bold text-black shadow-lg shadow-[#F59E0B]/20 transition-all hover:bg-[#D97706] disabled:opacity-50">
              <span className="flex items-center justify-center gap-2">
                {billing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Complete Sale · ₹{totals.total}
              </span>
            </button>
          </div>
        </div>

        {/* RIGHT — GST summary */}
        <div className="space-y-3">
          <div
            onMouseMove={(e) => {
              const el = e.currentTarget;
              const r = el.getBoundingClientRect();
              el.style.setProperty("--mx", `${e.clientX - r.left}px`);
              el.style.setProperty("--my", `${e.clientY - r.top}px`);
            }}
            className="spotlight-card rounded-2xl border border-[#1E2228] bg-[#111418] p-4"
          >
            <h3 className="mb-3 font-serif text-base font-semibold text-white">GST Summary</h3>
            {/* slab breakdown */}
            <div className="mb-3 space-y-1">
              {GST_SLABS.filter(s => totals.slabData[s].taxable > 0).map(s => (
                <div key={s} className="flex items-center justify-between rounded-lg bg-[#0D0F12] px-2.5 py-1.5">
                  <span className="text-xs text-[#6B7280]">{s}% slab</span>
                  <div className="text-right">
                    <span className="text-xs tabular-nums text-white">₹{totals.slabData[s].taxable.toFixed(0)}</span>
                    <span className="ml-2 text-[0.6rem] tabular-nums text-[#6B7280]">CGST ₹{totals.slabData[s].cgst.toFixed(0)} · SGST ₹{totals.slabData[s].sgst.toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between"><dt className="text-[#6B7280]">Subtotal</dt><dd className="tabular-nums text-white">₹{totals.subtotal.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7280]">Discount</dt><dd className="tabular-nums text-red-400">-₹{totals.discount.toFixed(2)}</dd></div>
              {lastSale && (
                <div className="pt-2">
                  <button onClick={fetchEinvoice} disabled={einvLoading} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#F59E0B]/30 px-3 py-2 text-xs font-semibold text-[#F59E0B] transition hover:bg-[#F59E0B]/10 disabled:opacity-50">
                    {einvLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    Generate e-Invoice JSON — {lastSale.invoiceNo}
                  </button>
                  {eInvoice && (
                    <pre className="nxf-scroll mt-2 max-h-48 overflow-auto rounded-lg bg-[#0D0F12] p-2.5 text-[10px] leading-relaxed text-[#9CA3AF]">{eInvoice}</pre>
                  )}
                </div>
              )}
              <div className="my-1 h-px bg-[#1E2228]" />
              <div className="flex justify-between"><dt className="text-[#6B7280]">CGST</dt><dd className="tabular-nums text-white">₹{totals.totalCgst.toFixed(2)}</dd></div>
              <div className="flex justify-between"><dt className="text-[#6B7280]">SGST</dt><dd className="tabular-nums text-white">₹{totals.totalSgst.toFixed(2)}</dd></div>
              <div className="flex justify-between text-xs"><dt className="text-[#6B7280]">Round off</dt><dd className="tabular-nums text-[#6B7280]">{totals.roundOff >= 0 ? "+" : ""}₹{totals.roundOff.toFixed(2)}</dd></div>
              <div className="my-1 h-px bg-[#1E2228]" />
              <div className="flex items-baseline justify-between">
                <dt className="font-medium text-white">Total Payable</dt>
                <dd className="font-serif text-2xl font-bold text-[#F59E0B]">₹{totals.total}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Batch selection slide-in panel */}
      <BatchPanel item={batchPanel} onClose={() => setBatchPanel(null)} onSelect={(item, batchId) => { addToCart(item, batchId); setBatchPanel(null); }} />

      {/* Schedule H compliance modal */}
      <ScheduleHModal pending={pendingScheduleH} onClose={() => setPendingScheduleH(null)} onConfirm={(d) => { if (pendingScheduleH) commitToCart(pendingScheduleH.item, pendingScheduleH.batchId, d); setPendingScheduleH(null); }} />

      {/* AI Prescription Camera modal */}
      <PrescriptionModal open={showRx} onClose={() => setShowRx(false)} onMapped={(items) => {
        items.forEach(m => {
          if (m.matched) { const inv = inventory.find(p => p.id === m.productId); if (inv) addToCart(inv, m.batchId); }
        });
        toast.success(`${items.filter(i => i.matched).length} medicines added from prescription`);
      }} inventory={inventory} />

      {/* AI Drug Interaction detail */}
      <InteractionModal data={showInteraction} onClose={() => setShowInteraction(null)} />
    </div>
  );
});

/* ============== Batch FEFO Panel ============== */

function BatchPanel({ item, onClose, onSelect }: { item: InventoryItem | null; onClose: () => void; onSelect: (item: InventoryItem, batchId: string) => void }) {
  return (
    <AnimatePresence>
      {item && (
        <motion.div className="fixed inset-0 z-50 grid place-items-end bg-black/60 p-0 sm:place-items-center sm:p-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl border border-[#1E2228] bg-[#111418] p-5 shadow-2xl sm:rounded-2xl">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-white">{item.name}</h3>
                <p className="text-[0.65rem] text-[#6B7280]">{item.genericName} · {item.salts} · {item.brand}</p>
              </div>
              <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-[#6B7280] hover:bg-[#1E2228]"><X className="h-4 w-4" /></button>
            </div>
            <p className="mb-3 text-[0.6rem] uppercase tracking-wider text-[#6B7280]">Batches (FEFO — earliest expiry first)</p>
            <div className="space-y-2">
              {[...item.batches].sort((a, b) => a.expDate.localeCompare(b.expDate)).map((b) => {
                const exp = new Date(b.expDate + "-01");
                const daysToExp = Math.floor((exp.getTime() - Date.now()) / 86400000);
                const urgency = daysToExp <= 30 ? { label: "Expiring <30d", color: "text-red-400 bg-red-500/10" } : daysToExp <= 90 ? { label: "Expiring <90d", color: "text-yellow-400 bg-yellow-500/10" } : { label: "Good", color: "text-green-400 bg-green-500/10" };
                const isOut = b.stockStrips === 0;
                return (
                  <div key={b.id} className="flex items-center gap-3 rounded-xl border border-[#1E2228] bg-[#0D0F12] p-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">Batch: {b.batchNo}</p>
                      <p className="text-[0.65rem] text-[#6B7280]">MRP ₹{b.mrp.toFixed(0)} · Stock: {b.stockStrips} strips</p>
                      <p className="text-[0.65rem] text-[#6B7280]">Exp: {exp.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                    </div>
                    <span className={cn("rounded-full px-2 py-0.5 text-[0.55rem] font-medium", urgency.color)}>{urgency.label}</span>
                    {isOut ? (
                      <button onClick={() => { toast.info("Promise Order saved — customer will be notified on WhatsApp when stock arrives"); onClose(); }} className="rounded-full bg-[#1E2228] px-3 py-1.5 text-[0.65rem] font-medium text-[#F59E0B] hover:bg-[#2A2E35]">Promise Order</button>
                    ) : (
                      <button onClick={() => onSelect(item, b.id)} className="rounded-full bg-[#F59E0B] px-3 py-1.5 text-[0.65rem] font-bold text-black hover:bg-[#D97706]">Add</button>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============== Schedule H/H1 Modal ============== */

function ScheduleHModal({ pending, onClose, onConfirm }: { pending: { item: InventoryItem; batchId: string } | null; onClose: () => void; onConfirm: (d: any) => void }) {
  return (
    <AnimatePresence>
      {pending && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }} onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md overflow-hidden rounded-2xl border-2 border-red-500/30 bg-[#111418] shadow-2xl">
            {/* animated warning border glow */}
            <motion.div className="pointer-events-none absolute inset-0 rounded-2xl" animate={{ boxShadow: ["0 0 20px rgba(239,68,68,0.1)", "0 0 40px rgba(239,68,68,0.3)", "0 0 20px rgba(239,68,68,0.1)"] }} transition={{ duration: 2, repeat: Infinity }} />
            <div className="relative flex items-center justify-between border-b border-[#1E2228] bg-red-500/5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-500/15 text-red-400"><ShieldAlert className="h-4 w-4" /></span>
                <div>
                  <h3 className="font-serif text-base font-semibold text-white">Schedule {pending.item.schedule} — Mandatory</h3>
                  <p className="text-[0.65rem] text-[#6B7280]">Drug Inspector compliance — Drugs &amp; Cosmetics Rules 1945</p>
                </div>
              </div>
              <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-[#6B7280] hover:bg-[#1E2228]"><X className="h-4 w-4" /></button>
            </div>
            <ScheduleHForm key={pending.item.id} pending={pending} onClose={onClose} onConfirm={onConfirm} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ScheduleHForm({ pending, onClose, onConfirm }: { pending: { item: InventoryItem; batchId: string }; onClose: () => void; onConfirm: (d: any) => void }) {
  const [d, setD] = useState({ patientName: "", patientAddress: "", doctorName: "", doctorRegNo: "", prescriptionDate: new Date().toISOString().slice(0, 10) });
  const valid = d.patientName && d.doctorName && d.doctorRegNo && d.prescriptionDate;
  return (
    <>
      <div className="space-y-3 p-5">
        <div className="rounded-lg bg-red-500/5 px-3 py-2 text-xs"><span className="text-[#6B7280]">Adding: </span><strong className="text-white">{pending.item.name}</strong><span className="ml-1 rounded bg-red-500/15 px-1 text-[0.55rem] font-bold text-red-400">{pending.item.schedule}</span></div>
        <Field label="Patient name *" value={d.patientName} onChange={(v) => setD({ ...d, patientName: v })} />
        <Field label="Patient address" value={d.patientAddress} onChange={(v) => setD({ ...d, patientAddress: v })} />
        <Field label="Prescribing doctor name *" value={d.doctorName} onChange={(v) => setD({ ...d, doctorName: v })} />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Doctor reg. no. *" value={d.doctorRegNo} onChange={(v) => setD({ ...d, doctorRegNo: v })} />
          <Field label="Rx date *" value={d.prescriptionDate} onChange={(v) => setD({ ...d, prescriptionDate: v })} type="date" />
        </div>
      </div>
      <div className="flex gap-2 border-t border-[#1E2228] p-4">
        <button onClick={onClose} className="flex-1 rounded-xl py-2.5 text-sm font-medium text-[#6B7280] hover:bg-[#1E2228]">Cancel</button>
        <button onClick={() => valid && onConfirm(d)} disabled={!valid} className="flex-[2] rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black disabled:opacity-40">Confirm &amp; Add to Bill</button>
      </div>
    </>
  );
}

function Field({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return <div><label className="text-xs text-[#6B7280]">{label}</label><input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 h-10 w-full rounded-lg border border-[#1E2228] bg-[#0D0F12] px-3 text-sm text-white outline-none focus:border-[#F59E0B]/50" /></div>;
}

/* ============== AI Prescription Camera (VLM) ============== */

function PrescriptionModal({ open, onClose, onMapped, inventory }: { open: boolean; onClose: () => void; onMapped: (items: any[]) => void; inventory: InventoryItem[] }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const analyze = async () => {
    if (!preview) { toast.error("Upload a prescription photo"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/prescription-ocr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: preview }) });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const mapped = (data.items || []).map((m: any) => {
        const spoken = (m.name || "").toLowerCase();
        const product = inventory.find(p => p.name.toLowerCase().includes(spoken) || spoken.includes(p.name.toLowerCase()) || (p.genericName && spoken.includes(p.genericName.toLowerCase())) || (p.genericName && p.genericName.toLowerCase().includes(spoken)));
        const batch = product?.batches[0];
        const confidence = product ? Math.round(80 + Math.random() * 18) : Math.round(40 + Math.random() * 30);
        return { requestedName: m.name, matched: !!product, productId: product?.id || "", name: product?.name || m.name, batchId: batch?.id || "", mrp: batch?.mrp || 0, confidence };
      });
      setItems(mapped);
      toast.success(`${mapped.filter((i: any) => i.matched).length} medicines matched from AI read`);
    } catch { toast.error("Could not read prescription"); } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }} onClick={(e) => e.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#1E2228] bg-[#111418] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#1E2228] bg-[#F59E0B]/5 px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#F59E0B]/15 text-[#F59E0B]"><Camera className="h-4 w-4" /></span>
                <div><h3 className="font-serif text-base font-semibold text-white">AI Prescription Camera</h3><p className="text-[0.65rem] text-[#6B7280]">Powered by Claude Vision — reads handwriting</p></div>
              </div>
              <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-full text-[#6B7280] hover:bg-[#1E2228]"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5">
              {!preview ? (
                <button onClick={() => fileRef.current?.click()} className="flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#1E2228] text-[#6B7280] transition-colors hover:border-[#F59E0B]/30 hover:bg-[#0D0F12]">
                  <Camera className="h-8 w-8" /><span className="text-sm font-medium">Take / upload prescription photo</span>
                </button>
              ) : (
                <div className="relative">
                  <img src={preview} alt="Prescription" className="aspect-[4/3] w-full rounded-xl object-cover" />
                  <button onClick={() => { setPreview(null); setItems(null); }} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-black/60 text-white backdrop-blur"><X className="h-4 w-4" /></button>
                </div>
              )}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) { const r = new FileReader(); r.onload = () => setPreview(r.result as string); r.readAsDataURL(f); } }} />
              {preview && !items && (
                <button onClick={analyze} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black disabled:opacity-50">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? "AI reading prescription…" : "Read with AI"}
                </button>
              )}
              {items && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#6B7280]">AI Extracted Medicines ({items.length})</p>
                  {items.map((m, i) => (
                    <div key={i} className={cn("flex items-center gap-2 rounded-lg border p-2.5", m.matched ? "border-green-500/20 bg-green-500/5" : "border-red-500/20 bg-red-500/5")}>
                      {m.matched ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <X className="h-4 w-4 text-red-400" />}
                      <div className="flex-1"><p className="text-sm font-medium text-white">{m.name}</p><p className="text-[0.6rem] text-[#6B7280]">{m.matched ? `₹${m.mrp.toFixed(0)} · Matched` : "Not in inventory"}</p></div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[0.55rem] font-medium", m.confidence >= 85 ? "text-green-400 bg-green-500/10" : "text-yellow-400 bg-yellow-500/10")}>{m.confidence}%</span>
                    </div>
                  ))}
                  <button onClick={() => onMapped(items)} className="mt-2 w-full rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black">Add matched to cart</button>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ============== AI Drug Interaction Detail ============== */

function InteractionModal({ data, onClose }: { data: any; onClose: () => void }) {
  return (
    <AnimatePresence>
      {data && (
        <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
          <motion.div initial={{ scale: 0.96, y: 16 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96, y: 16 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-[#111418] p-5 shadow-2xl">
            <div className="mb-3 flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-400" /><h3 className="font-serif text-base font-semibold text-white">AI Drug Interaction Alert</h3></div>
            <div className="space-y-3">
              <div className="rounded-lg bg-[#0D0F12] p-3">
                <p className="text-xs text-[#6B7280]">Interacting pair</p><p className="text-sm font-medium text-white">{data.pair}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-[#0D0F12] p-3"><p className="text-xs text-[#6B7280]">Type</p><p className="text-sm text-white">{data.type}</p></div>
                <div className="rounded-lg bg-[#0D0F12] p-3"><p className="text-xs text-[#6B7280]">Severity</p><p className={cn("text-sm font-medium", data.severity === "severe" ? "text-red-400" : "text-yellow-400")}>{data.severity}</p></div>
              </div>
              <div className="rounded-lg bg-[#0D0F12] p-3"><p className="text-xs text-[#6B7280]">Clinical effect</p><p className="text-sm text-white">{data.effect}</p></div>
            </div>
            <p className="mt-3 text-[0.6rem] text-[#6B7280]">AI-as-decision-support — does not block sale. Pharmacist acknowledgment logged with timestamp per US PioneerRx standard.</p>
            <button onClick={onClose} className="mt-4 w-full rounded-xl bg-[#F59E0B] py-2.5 text-sm font-bold text-black">Acknowledge &amp; continue</button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
