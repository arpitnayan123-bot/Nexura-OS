// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pill, Search, X, ArrowRightLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type InventoryItem = {
  id: string;
  name: string;
  genericName: string | null;
  brand: string | null;
  salts: string | null;
  stockStrips: number;
  batches: { id: string; batchNo: string; mrp: number; stockStrips: number }[];
};

export function SaltFinder({
  open,
  onClose,
  inventory,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  onAdd: (item: InventoryItem, batchId?: string) => void;
}) {
  const [q, setQ] = useState("");

  // group by generic salt composition
  const groups = useMemo(() => {
    const map = new Map<string, InventoryItem[]>();
    for (const p of inventory) {
      const key = p.genericName || p.salts || p.name;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(p);
    }
    const arr = [...map.entries()].map(([salt, items]) => ({ salt, items }));
    if (!q.trim()) return arr.slice(0, 20);
    const ql = q.toLowerCase();
    return arr
      .filter(
        ([s, items]) =>
          s.toLowerCase().includes(ql) ||
          items.some(
            (i) =>
              i.name.toLowerCase().includes(ql) ||
              i.brand?.toLowerCase().includes(ql) ||
              i.salts?.toLowerCase().includes(ql)
          )
      )
      .slice(0, 30);
  }, [inventory, q]);

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
            className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border bg-gradient-to-r from-sage/10 to-honey/10 p-4">
              <div className="flex items-center gap-2">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-sage/20 text-sage">
                  <Pill className="h-4.5 w-4.5" />
                </span>
                <div>
                  <h3 className="font-display font-semibold">Salt composition finder</h3>
                  <p className="text-[0.65rem] text-muted-foreground">
                    Find generic alternatives by salt — switch brands when out of stock
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-full hover:bg-accent"
                aria-label="Close salt finder"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-border p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Type a salt or brand — e.g. Paracetamol, Azithromycin…"
                  className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-4 text-sm outline-none focus-visible:border-primary/50"
                />
              </div>
            </div>

            <div className="max-h-[55vh] overflow-auto p-3">
              {groups.length === 0 && (
                <p className="py-10 text-center text-sm text-muted-foreground">
                  No matches for “{q}”.
                </p>
              )}
              {groups.map(({ salt, items }) => (
                <div key={salt} className="mb-3 rounded-xl border border-border bg-background/50 p-3">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-md bg-accent/60 px-2 py-0.5 text-[0.65rem] font-medium text-foreground">
                      {salt}
                    </span>
                    <span className="text-[0.6rem] text-muted-foreground">
                      {items.length} brand(s)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {items.map((p) => {
                      const out = p.stockStrips === 0;
                      return (
                        <div
                          key={p.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg border px-2.5 py-1.5",
                            out ? "border-destructive/30 bg-destructive/5 opacity-70" : "border-border bg-card"
                          )}
                        >
                          <div className="leading-tight">
                            <p className="text-xs font-semibold">{p.name}</p>
                            <p className="text-[0.6rem] text-muted-foreground">
                              {p.brand} · ₹{p.batches[0]?.mrp.toFixed(0)} ·{" "}
                              {out ? "OUT" : `${p.stockStrips} left`}
                            </p>
                          </div>
                          {out ? (
                            <ArrowRightLeft className="h-3.5 w-3.5 text-destructive" />
                          ) : (
                            <button
                              onClick={() => {
                                onAdd(p);
                                toast.success(`Added ${p.name}`);
                              }}
                              className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
