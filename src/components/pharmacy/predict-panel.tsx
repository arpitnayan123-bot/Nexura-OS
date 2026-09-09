"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  X,
  TrendingDown,
  PackageX,
  ShoppingCart,
  Loader2,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Predict = {
  dumpStock: {
    product: string;
    batchNo: string;
    expDate: string;
    monthsToExpiry: number;
    stockStrips: number;
    risk: "high" | "medium" | "low";
  }[];
  reorder: {
    product: string;
    genericName: string | null;
    currentStock: number;
    reorderLevel: number;
    avgMonthlySales: number;
    suggestedQty: number;
  }[];
  demand: { product: string; season: "peak" | "moderate" | "low"; note: string }[];
  summary: { dumpCount: number; highRisk: number; reorderCount: number; totalStockUnits: number };
};

export function PredictPanel({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [data, setData] = useState<Predict | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/pharmacy/predict");
      if (!res.ok) throw new Error();
      const d = await res.json();
      setData(d);
    } catch {
      toast.error("Could not load predictions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && !data) load();
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.96, y: 16 }}
            onClick={(e) => e.stopPropagation()}
            className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between bg-gradient-to-r from-primary/10 to-honey/10 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-primary">
                  <Sparkles className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-display font-semibold">AI Predictive Analytics</h3>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Dump-stock alerts · auto reorder · seasonal demand
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-auto p-4">
              {loading ? (
                <div className="flex h-40 items-center justify-center text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : data ? (
                <div className="space-y-5">
                  {/* summary */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <Stat label="Dump stock" value={data.summary.dumpCount} icon={PackageX} tone="clay" />
                    <Stat label="High risk" value={data.summary.highRisk} icon={TrendingDown} tone="destructive" />
                    <Stat label="Reorder" value={data.summary.reorderCount} icon={ShoppingCart} tone="primary" />
                    <Stat label="Stock units" value={data.summary.totalStockUnits} icon={Calendar} tone="sage" />
                  </div>

                  {/* dump stock */}
                  <Section title="Dump-stock — act before expiry" icon={PackageX}>
                    {data.dumpStock.length === 0 ? (
                      <Empty>No batches at risk. Calm.</Empty>
                    ) : (
                      data.dumpStock.map((d, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{d.product}</p>
                            <p className="text-[0.65rem] text-muted-foreground">
                              {d.batchNo} · exp {d.expDate} · {d.stockStrips} strips left
                            </p>
                          </div>
                          <RiskBadge risk={d.risk} months={d.monthsToExpiry} />
                        </div>
                      ))
                    )}
                  </Section>

                  {/* reorder */}
                  <Section title="Intelligent reorder suggestions" icon={ShoppingCart}>
                    {data.reorder.length === 0 ? (
                      <Empty>All stock above reorder levels.</Empty>
                    ) : (
                      data.reorder.map((r, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{r.product}</p>
                            <p className="text-[0.65rem] text-muted-foreground">
                              {r.genericName} · now {r.currentStock} / {r.reorderLevel} · avg {r.avgMonthlySales}/mo
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-display text-sm font-bold text-primary">
                              +{r.suggestedQty}
                            </p>
                            <p className="text-[0.55rem] text-muted-foreground">suggested</p>
                          </div>
                        </div>
                      ))
                    )}
                  </Section>

                  {/* seasonal demand */}
                  <Section title="Seasonal demand forecast" icon={Calendar}>
                    {data.demand.map((d, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-2"
                      >
                        <div>
                          <p className="text-sm font-medium">{d.product}</p>
                          <p className="text-[0.65rem] text-muted-foreground">{d.note}</p>
                        </div>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[0.6rem] font-semibold",
                            d.season === "peak"
                              ? "bg-coral/15 text-coral"
                              : d.season === "moderate"
                              ? "bg-honey/15 text-honey"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {d.season.toUpperCase()}
                        </span>
                      </div>
                    ))}
                  </Section>
                </div>
              ) : null}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Stat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  tone: "primary" | "clay" | "destructive" | "sage";
}) {
  const colors = {
    primary: "bg-primary/10 text-primary",
    clay: "bg-clay/10 text-clay",
    destructive: "bg-destructive/10 text-destructive",
    sage: "bg-sage/10 text-sage",
  };
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <Icon className={cn("h-4 w-4", colors[tone])} />
      <p className="mt-1 font-display text-xl font-bold tabular-nums">{value}</p>
      <p className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h4 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
      {children}
    </p>
  );
}

function RiskBadge({
  risk,
  months,
}: {
  risk: "high" | "medium" | "low";
  months: number;
}) {
  const c =
    risk === "high"
      ? "bg-destructive/15 text-destructive"
      : risk === "medium"
      ? "bg-honey/15 text-honey"
      : "bg-sage/15 text-sage";
  return (
    <span className={cn("rounded-full px-2 py-0.5 text-[0.6rem] font-semibold", c)}>
      {risk.toUpperCase()} · {months}mo
    </span>
  );
}
