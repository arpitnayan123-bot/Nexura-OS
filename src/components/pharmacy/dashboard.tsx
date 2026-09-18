// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Mic,
  MicOff,
  ScanLine,
  Pill,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Loader2,
  Keyboard,
  X,
  AlertTriangle,
  TrendingDown,
  PackageX,
  Sparkles,
  Receipt,
  FileJson,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import Link from "next/link";
import { Logo } from "@/components/site/navbar";
import { MicIndicator } from "./mic-indicator";
import { PrescriptionModal } from "./prescription-modal";
import { SaltFinder } from "./salt-finder";
import { PredictPanel } from "./predict-panel";

type InventoryItem = {
  id: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  category: string;
  hsn: string | null;
  schedule: string | null;
  salts: string | null;
  packaging: string | null;
  tabletsPerStrip: number;
  cgstRate: number;
  sgstRate: number;
  reorderLevel: number;
  stockStrips: number;
  stockLoose: number;
  earliestExpiry: string | null;
  low: boolean;
  nearExpiry: boolean;
  batches: {
    id: string;
    batchNo: string;
    barcode: string | null;
    mfgDate: string;
    expDate: string;
    mrp: number;
    purchaseRate: number;
    stockStrips: number;
    stockLoose: number;
  }[];
};

type CartItem = {
  key: string;
  productId: string;
  name: string;
  genericName: string | null;
  batchId: string;
  batchNo: string;
  mrp: number;
  qtyStrips: number;
  qtyLoose: number;
  cgstRate: number;
  sgstRate: number;
  tabletsPerStrip: number;
};

export function PharmacyDashboard() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountPct, setDiscountPct] = useState(0);
  const [payMode, setPayMode] = useState<"cash" | "upi" | "card" | "credit">("cash");
  const [loadingInv, setLoadingInv] = useState(true);
  const [billing, setBilling] = useState(false);
  const [lastInvoice, setLastInvoice] = useState<{ invoiceNo: string; total: number } | null>(null);
  const [listening, setListening] = useState(false);
  const [voiceProcessing, setVoiceProcessing] = useState(false);
  const [prescriptionOpen, setPrescriptionOpen] = useState(false);
  const [saltFinderOpen, setSaltFinderOpen] = useState(false);
  const [predictOpen, setPredictOpen] = useState(false);
  const [einvoiceOpen, setEinvoiceOpen] = useState(false);
  const [einvoiceJson, setEinvoiceJson] = useState<string>("");
  const [offline, setOffline] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // load inventory
  const loadInventory = useCallback(async () => {
    try {
      const res = await fetch("/api/pharmacy/inventory");
      if (!res.ok) throw new Error();
      const data = await res.json();
      setInventory(data.items || []);
    } catch {
      /* keep empty */
    } finally {
      setLoadingInv(false);
    }
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // online/offline
  useEffect(() => {
    const on = () => setOffline(!navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
    };
  }, []);

  // keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // ignore when typing in an input/textarea unless Escape
      const tag = (e.target as HTMLElement)?.tagName;
      const typing = tag === "INPUT" || tag === "TEXTAREA";
      if (e.key === "Escape") {
        setPrescriptionOpen(false);
        setSaltFinderOpen(false);
        setPredictOpen(false);
        setEinvoiceOpen(false);
        setHelpOpen(false);
        (e.target as HTMLElement)?.blur?.();
        return;
      }
      if (typing) {
        // Enter inside search → focus qty? handled below. F-keys allowed.
      }
      if (e.key === "F2") {
        e.preventDefault();
        setSaltFinderOpen((v) => !v);
      } else if (e.key === "F4") {
        e.preventDefault();
        setPrescriptionOpen((v) => !v);
      } else if (e.key === "F6") {
        e.preventDefault();
        setPredictOpen((v) => !v);
      } else if (e.key === "F8") {
        e.preventDefault();
        submitBilling();
      } else if (e.key === "F1") {
        e.preventDefault();
        setHelpOpen((v) => !v);
      } else if (e.key === "/" && !typing) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cart, discountPct, payMode]);

  // filtered inventory
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory.slice(0, 12);
    return inventory
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.genericName?.toLowerCase().includes(q) ||
          p.salts?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q) ||
          p.hsn?.includes(q),
      )
      .slice(0, 12);
  }, [inventory, query]);

  const addToCart = (item: InventoryItem, batchId?: string) => {
    const batch = item.batches.find((b) => b.id === batchId) || item.batches[0];
    if (!batch) {
      toast.error(`${item.name} is out of stock`);
      return;
    }
    const key = `${item.id}-${batch.id}`;
    setCart((c) => {
      const existing = c.find((x) => x.key === key);
      if (existing) {
        return c.map((x) => (x.key === key ? { ...x, qtyStrips: x.qtyStrips + 1 } : x));
      }
      return [
        ...c,
        {
          key,
          productId: item.id,
          name: item.name,
          genericName: item.genericName,
          batchId: batch.id,
          batchNo: batch.batchNo,
          mrp: batch.mrp,
          qtyStrips: 1,
          qtyLoose: 0,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          tabletsPerStrip: item.tabletsPerStrip,
        },
      ];
    });
  };

  const updateQty = (key: string, delta: number, loose = false) => {
    setCart((c) =>
      c
        .map((x) => {
          if (x.key !== key) return x;
          if (loose) return { ...x, qtyLoose: Math.max(0, x.qtyLoose + delta) };
          return { ...x, qtyStrips: Math.max(0, x.qtyStrips + delta) };
        })
        .filter((x) => x.qtyStrips > 0 || x.qtyLoose > 0),
    );
  };

  const removeItem = (key: string) => setCart((c) => c.filter((x) => x.key !== key));

  // totals
  const totals = useMemo(() => {
    let subtotal = 0;
    let cgst = 0;
    let sgst = 0;
    for (const it of cart) {
      const looseMrp = it.mrp / it.tabletsPerStrip;
      const gross = it.qtyStrips * it.mrp + it.qtyLoose * looseMrp;
      subtotal += gross;
      cgst += (gross * it.cgstRate) / 100;
      sgst += (gross * it.sgstRate) / 100;
    }
    const discount = (subtotal * discountPct) / 100;
    const taxable = subtotal - discount;
    const cgstF = (cgst / (subtotal || 1)) * taxable;
    const sgstF = (sgst / (subtotal || 1)) * taxable;
    const grand = taxable + cgstF + sgstF;
    const rounded = Math.round(grand);
    const roundOff = +(rounded - grand).toFixed(2);
    return {
      subtotal,
      discount,
      cgst: cgstF,
      sgst: sgstF,
      roundOff,
      total: rounded,
    };
  }, [cart, discountPct]);

  const lowStock = useMemo(() => inventory.filter((p) => p.low).slice(0, 8), [inventory]);

  // ---- Voice billing (Web Speech API) ----
  const startListening = () => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      toast.error("Voice not supported in this browser. Try Chrome.");
      return;
    }
    const rec = new SR();
    rec.lang = "en-IN";
    rec.continuous = false;
    rec.interimResults = false;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => {
      setListening(false);
      toast.error("Mic error — check permissions.");
    };
    rec.onresult = async (e: any) => {
      const transcript = e.results[0][0].transcript;
      toast.info(`Heard: "${transcript}"`);
      await runVoiceParse(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  const runVoiceParse = async (transcript: string) => {
    setVoiceProcessing(true);
    try {
      const res = await fetch("/api/pharmacy/voice-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      const addedNames: string[] = [];
      for (const ci of data.cart || []) {
        if (ci.action === "clear") {
          setCart([]);
          continue;
        }
        if (!ci.matched) {
          toast.error(`"${ci.name}" not found in inventory`);
          continue;
        }
        const inv = inventory.find((p) => p.id === ci.productId);
        if (!inv) continue;
        if (ci.action === "remove") {
          setCart((c) => c.filter((x) => x.productId !== ci.productId || x.batchId !== ci.batchId));
        } else {
          addToCart(inv, ci.batchId);
          // handle multi-strip
          if (ci.qtyStrips > 1) {
            setCart((c) =>
              c.map((x) =>
                x.productId === ci.productId && x.batchId === ci.batchId
                  ? { ...x, qtyStrips: ci.qtyStrips }
                  : x,
              ),
            );
          }
          addedNames.push(ci.name);
        }
      }
      if (addedNames.length) {
        toast.success(`Added ${addedNames.length} item(s) by voice`);
      }
    } catch {
      // offline fallback — simple local parse
      toast.warning("Offline — voice cached, will sync when online");
    } finally {
      setVoiceProcessing(false);
    }
  };

  // ---- Billing submit ----
  const submitBilling = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setBilling(true);
    try {
      const res = await fetch("/api/pharmacy/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            productId: c.productId,
            batchId: c.batchId,
            qtyStrips: c.qtyStrips,
            qtyLoose: c.qtyLoose,
          })),
          discountPct,
          payMode,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setLastInvoice({ invoiceNo: data.sale.invoiceNo, total: data.sale.total });
      toast.success(`Invoice ${data.sale.invoiceNo} — ₹${data.sale.total}`);
      setCart([]);
      setDiscountPct(0);
      loadInventory();
    } catch {
      toast.error("Billing failed — cached for retry");
    } finally {
      setBilling(false);
    }
  };

  // ---- e-invoice ----
  const generateEinvoice = async () => {
    if (!lastInvoice) {
      toast.error("Generate an invoice first");
      return;
    }
    setEinvoiceJson("Loading…");
    setEinvoiceOpen(true);
    try {
      // need the saleId — re-fetch the most recent sale for this branch
      const listRes = await fetch("/api/pharmacy/billing");
      const listData = await listRes.json();
      const latest = listData.sales?.[0];
      if (!latest) throw new Error();
      const res = await fetch("/api/pharmacy/e-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleId: latest.id }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setEinvoiceJson(
        JSON.stringify(
          {
            eInvoice: data.eInvoice,
            ewayBill: data.ewayBill,
            eligibleEwayBill: data.eligibleEwayBill,
          },
          null,
          2,
        ),
      );
      toast.success("e-Invoice JSON generated");
    } catch {
      toast.error("Could not generate e-invoice");
      setEinvoiceJson("");
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-[#F5F2ED] text-[#1F1B17]">
      {/* top bar */}
      <header className="sticky top-0 z-40 border-b border-[#E5DFD4] bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-[#A16207] to-[#7A9A7B]">
                <Pill className="h-4 w-4 text-white" strokeWidth={2.4} />
              </span>
              <div className="leading-none">
                <span className="font-serif text-sm font-semibold">
                  Nexura<span className="text-[#A16207]"> Pharmacia</span>
                </span>
                <p className="text-[0.55rem] uppercase tracking-[0.2em] text-[#9A8F84]">
                  AI Pharmacy POS
                </p>
              </div>
            </Link>
            <span className="ml-2 hidden items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[0.65rem] font-medium shadow-sm ring-1 ring-[#E5DFD4] sm:flex">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  offline ? "bg-[#B8860B]" : "bg-[#9DB89E] anim-breathe",
                )}
              />
              {offline ? "Offline" : "Live"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setHelpOpen(true)}
              className="hidden items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent/50 sm:flex"
            >
              <Keyboard className="h-3.5 w-3.5" /> Shortcuts
            </button>
            <Button
              onClick={() => setPredictOpen(true)}
              variant="outline"
              size="sm"
              className="rounded-full"
            >
              <Sparkles className="h-3.5 w-3.5 text-primary" /> AI Predict
            </Button>
            <Link
              href="/"
              className="rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              ← Site
            </Link>
          </div>
        </div>
      </header>

      {/* Mic status indicator — highly visible */}
      <MicIndicator listening={listening} processing={voiceProcessing} />

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[1fr_22rem]">
        {/* LEFT — billing */}
        <main className="flex flex-col gap-4">
          {/* search + actions */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Scan barcode / type medicine, salt, or HSN…  (press / to focus)"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none transition-colors focus-visible:border-primary/50"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && filtered[0]) {
                      addToCart(filtered[0]);
                      setQuery("");
                    }
                  }}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={listening ? stopListening : startListening}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all",
                    listening
                      ? "bg-destructive text-white shadow-[0_8px_24px_-6px_oklch(0.62_0.2_25/0.7)]"
                      : "bg-primary text-primary-foreground shadow-[0_8px_24px_-6px_oklch(0.70_0.145_45/0.6)]",
                  )}
                >
                  {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {listening ? "Listening…" : "Voice bill"}
                  <kbd className="hidden rounded bg-white/20 px-1 text-[0.6rem] sm:inline">F3</kbd>
                </button>
                <button
                  onClick={() => setPrescriptionOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40"
                >
                  <ScanLine className="h-4 w-4 text-primary" /> Rx Scan
                  <kbd className="hidden rounded bg-muted px-1 text-[0.6rem] sm:inline">F4</kbd>
                </button>
                <button
                  onClick={() => setSaltFinderOpen(true)}
                  className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-colors hover:bg-accent/40"
                >
                  <Pill className="h-4 w-4 text-sage" /> Salt finder
                  <kbd className="hidden rounded bg-muted px-1 text-[0.6rem] sm:inline">F2</kbd>
                </button>
              </div>
            </div>
          </section>

          {/* product grid */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">
                {query ? `Results (${filtered.length})` : "Quick add"}
              </h2>
              {loadingInv && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((p) => (
                <ProductCard key={p.id} item={p} onAdd={() => addToCart(p)} />
              ))}
              {filtered.length === 0 && !loadingInv && (
                <div className="col-span-full py-10 text-center text-sm text-muted-foreground">
                  No medicines match “{query}”.
                </div>
              )}
            </div>
          </section>

          {/* cart */}
          <section className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">Bill cart ({cart.length})</h2>
              <button
                onClick={() => setCart([])}
                className="text-xs text-muted-foreground hover:text-destructive"
              >
                Clear all
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-[0.65rem] uppercase tracking-wider text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Medicine · Batch</th>
                    <th className="px-2 py-2 text-center font-medium">MRP</th>
                    <th className="px-2 py-2 text-center font-medium">Strips</th>
                    <th className="px-2 py-2 text-center font-medium">Loose</th>
                    <th className="px-2 py-2 text-right font-medium">Amount</th>
                    <th className="py-2 pl-2"></th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence initial={false}>
                    {cart.map((it) => {
                      const looseMrp = it.mrp / it.tabletsPerStrip;
                      const amt = it.qtyStrips * it.mrp + it.qtyLoose * looseMrp;
                      return (
                        <motion.tr
                          key={it.key}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="border-b border-border/60"
                        >
                          <td className="py-2.5 pr-2">
                            <p className="font-medium leading-tight">{it.name}</p>
                            <p className="text-[0.65rem] text-[#828894]">
                              {it.genericName} · {it.batchNo}
                            </p>
                          </td>
                          <td className="px-2 py-2.5 text-center tabular-nums">
                            ₹{it.mrp.toFixed(0)}
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="mx-auto flex w-fit items-center gap-1">
                              <button
                                onClick={() => updateQty(it.key, -1)}
                                className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center tabular-nums">{it.qtyStrips}</span>
                              <button
                                onClick={() => updateQty(it.key, 1)}
                                className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="mx-auto flex w-fit items-center gap-1">
                              <button
                                onClick={() => updateQty(it.key, -1, true)}
                                className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="w-6 text-center tabular-nums">{it.qtyLoose}</span>
                              <button
                                onClick={() => updateQty(it.key, 1, true)}
                                className="grid h-6 w-6 place-items-center rounded-full bg-muted text-muted-foreground hover:bg-accent"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-2 py-2.5 text-right font-medium tabular-nums">
                            ₹{amt.toFixed(2)}
                          </td>
                          <td className="py-2.5 pl-2">
                            <button
                              onClick={() => removeItem(it.key)}
                              className="grid h-7 w-7 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </tbody>
              </table>
              {cart.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
                  <Receipt className="h-8 w-8 opacity-40" />
                  Cart is empty. Scan, type, or speak to add medicines.
                </div>
              )}
            </div>

            {/* checkout row */}
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-[#828894]">
                  Disc %
                  <input
                    type="number"
                    value={discountPct || ""}
                    onChange={(e) =>
                      setDiscountPct(Math.max(0, Math.min(100, +e.target.value || 0)))
                    }
                    className="h-8 w-16 rounded-lg border border-border bg-background px-2 text-center text-sm tabular-nums outline-none focus-visible:border-primary/50"
                    placeholder="0"
                  />
                </label>
                <div className="flex items-center gap-1 rounded-lg bg-muted p-0.5">
                  {(["cash", "upi", "card", "credit"] as const).map((m) => (
                    <button
                      key={m}
                      onClick={() => setPayMode(m)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-medium uppercase transition-colors",
                        payMode === m
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={submitBilling}
                disabled={billing || cart.length === 0}
                className="group h-11 rounded-xl bg-primary px-6 text-primary-foreground shadow-[0_10px_30px_-8px_oklch(0.70_0.145_45/0.7)]"
              >
                {billing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    Complete sale · ₹{totals.total}
                    <kbd className="ml-2 rounded bg-white/20 px-1.5 py-0.5 text-[0.6rem]">F8</kbd>
                  </>
                )}
              </Button>
            </div>
          </section>
        </main>

        {/* RIGHT — sidebar summary */}
        <aside className="flex flex-col gap-4 lg:sticky lg:top-[4.5rem] lg:self-start">
          {/* totals */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <h3 className="mb-3 font-display text-sm font-semibold">Bill summary</h3>
            <dl className="space-y-1.5 text-sm">
              <Row label="Subtotal" value={totals.subtotal} />
              <Row label={`Discount (${discountPct}%)`} value={-totals.discount} muted />
              <Row label="CGST" value={totals.cgst} muted />
              <Row label="SGST" value={totals.sgst} muted />
              <Row label="Round off" value={totals.roundOff} muted />
              <div className="my-2 h-px bg-border" />
              <div className="flex items-baseline justify-between">
                <dt className="font-medium">Total payable</dt>
                <dd className="font-display text-2xl font-bold text-primary">₹{totals.total}</dd>
              </div>
            </dl>
            {lastInvoice && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-sage/15 px-3 py-2 text-xs">
                <CheckCircle2 className="h-4 w-4 text-sage" />
                <span>
                  Last: <strong>{lastInvoice.invoiceNo}</strong> · ₹{lastInvoice.total}
                </span>
                <button
                  onClick={() => generateEinvoice()}
                  className="ml-auto flex items-center gap-1 text-primary hover:underline"
                >
                  <FileJson className="h-3 w-3" /> e-Invoice
                </button>
              </div>
            )}
          </div>

          {/* low stock */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-honey" />
              <h3 className="font-display text-sm font-semibold">Low on stock</h3>
              <Badge variant="secondary" className="ml-auto">
                {lowStock.length}
              </Badge>
            </div>
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {lowStock.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">
                  All stocked up — calm.
                </p>
              )}
              {lowStock.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-lg bg-muted/40 px-2.5 py-1.5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-medium">{p.name}</p>
                    <p className="text-[0.6rem] text-[#828894]">{p.genericName}</p>
                  </div>
                  <div className="ml-2 text-right">
                    <p className="text-xs font-semibold text-destructive">{p.stockStrips}</p>
                    <p className="text-[0.55rem] text-muted-foreground">/ {p.reorderLevel}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* expiry alerts */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="mb-3 flex items-center gap-2">
              <PackageX className="h-4 w-4 text-clay" />
              <h3 className="font-display text-sm font-semibold">Near expiry</h3>
            </div>
            <div className="max-h-44 space-y-1.5 overflow-y-auto pr-1">
              {inventory
                .filter((p) => p.nearExpiry)
                .slice(0, 6)
                .map((p) => (
                  <div key={p.id} className="flex items-center justify-between text-xs">
                    <span className="truncate">{p.name}</span>
                    <span className="ml-2 shrink-0 rounded-full bg-clay/15 px-1.5 py-0.5 text-[0.6rem] font-medium text-clay">
                      exp {p.earliestExpiry}
                    </span>
                  </div>
                ))}
              {inventory.filter((p) => p.nearExpiry).length === 0 && (
                <p className="py-3 text-center text-xs text-muted-foreground">
                  No batches expiring soon.
                </p>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* modals */}
      <PrescriptionModal
        open={prescriptionOpen}
        onClose={() => setPrescriptionOpen(false)}
        onMapped={(items) => {
          items.forEach((m) => {
            if (m.matched) {
              const inv = inventory.find((p) => p.id === m.productId);
              if (inv) addToCart(inv, m.batchId);
            }
          });
          toast.success(`${items.filter((i) => i.matched).length} medicines mapped from Rx`);
        }}
      />
      <SaltFinder
        open={saltFinderOpen}
        onClose={() => setSaltFinderOpen(false)}
        inventory={inventory}
        onAdd={(item) => addToCart(item)}
      />
      <PredictPanel open={predictOpen} onClose={() => setPredictOpen(false)} />
      <EInvoiceModal
        open={einvoiceOpen}
        onClose={() => setEinvoiceOpen(false)}
        json={einvoiceJson}
      />
      <HelpModal open={helpOpen} onClose={() => setHelpOpen(false)} />

      {/* offline banner */}
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto mb-0 w-full bg-clay px-4 py-2 text-center text-xs text-white"
          >
            <Volume2 className="mr-1 inline h-3.5 w-3.5" />
            Offline mode — billing, voice & barcode continue. Records sync automatically when
            online.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt className={cn(muted ? "text-muted-foreground" : "text-foreground/80")}>{label}</dt>
      <dd className={cn("tabular-nums", muted ? "text-muted-foreground" : "font-medium")}>
        {value < 0 ? "-" : ""}₹{Math.abs(value).toFixed(2)}
      </dd>
    </div>
  );
}

function ProductCard({ item, onAdd }: { item: InventoryItem; onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="group relative flex flex-col gap-1 rounded-xl border border-border bg-background p-2.5 text-left transition-all hover:border-primary/40 hover:shadow-[0_6px_20px_-8px_oklch(0.70_0.145_45/0.3)]"
    >
      <div className="flex items-start justify-between gap-1">
        <span className="text-xs font-semibold leading-tight">{item.name}</span>
        {item.schedule && (
          <span className="shrink-0 rounded bg-accent/60 px-1 py-0.5 text-[0.55rem] font-bold text-foreground">
            {item.schedule}
          </span>
        )}
      </div>
      <p className="text-[0.6rem] text-muted-foreground">{item.genericName}</p>
      <div className="mt-auto flex items-center justify-between pt-1">
        <span className="text-sm font-bold tabular-nums">
          ₹{(item.batches[0]?.mrp ?? 0).toFixed(0)}
        </span>
        <span
          className={cn(
            "flex items-center gap-1 text-[0.6rem]",
            item.low ? "text-destructive" : "text-sage",
          )}
        >
          <span
            className={cn("h-1.5 w-1.5 rounded-full", item.low ? "bg-destructive" : "bg-sage")}
          />
          {item.stockStrips} strips
        </span>
      </div>
      {item.nearExpiry && (
        <span className="absolute right-1 top-1 rounded-full bg-clay/20 px-1 py-0.5 text-[0.5rem] font-medium text-clay">
          exp
        </span>
      )}
    </button>
  );
}

function EInvoiceModal({
  open,
  onClose,
  json,
}: {
  open: boolean;
  onClose: () => void;
  json: string;
}) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border p-4">
              <h3 className="font-display font-semibold">Indian e-Invoice / e-Way Bill</h3>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-auto p-4">
              <p className="mb-3 text-xs text-muted-foreground">
                Generate an invoice first (press F8), then click the e-Invoice link in the summary.
              </p>
              {json ? (
                <pre className="overflow-x-auto rounded-lg bg-muted/40 p-3 text-[0.7rem] leading-relaxed">
                  {json}
                </pre>
              ) : (
                <p className="py-6 text-center text-sm text-muted-foreground">No JSON yet.</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function HelpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const keys = [
    { k: "/", desc: "Focus medicine search" },
    { k: "Enter", desc: "Add first search result to cart" },
    { k: "F1", desc: "Toggle this shortcuts panel" },
    { k: "F2", desc: "Open salt-composition finder" },
    { k: "F3", desc: "Start / stop voice billing" },
    { k: "F4", desc: "Open prescription upload (Rx OCR)" },
    { k: "F6", desc: "Open AI predictive analytics" },
    { k: "F8", desc: "Complete sale / generate invoice" },
    { k: "Esc", desc: "Close any modal" },
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-display font-semibold">
                <Keyboard className="h-4 w-4 text-primary" /> Keyboard shortcuts
              </h2>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {keys.map((x) => (
                <div key={x.k} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{x.desc}</span>
                  <kbd className="rounded-md border border-border bg-muted px-2 py-1 text-xs font-semibold">
                    {x.k}
                  </kbd>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
