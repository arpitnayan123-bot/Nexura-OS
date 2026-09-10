"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, ArrowUpRight, CornerDownLeft, Command,
  Building2, Stethoscope, Pill, MessageCircle, Globe,
  HeartPulse, Sparkles, ChevronRight, type LucideIcon,
  Clock, ArrowRight, TrendingUp, Shield, BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useBooking } from "./booking-context";

/* ============================================================
   COMMAND PALETTE — Linear / Raycast / Vercel inspired
   Premium, crisp, keyboard-first. No glassmorphism clutter.
   ============================================================ */

type Product = {
  id: string;
  name: string;
  sub: string;
  desc: string;
  icon: LucideIcon;
  accent: string;
  href: string;
  badge?: string;
  group: "products" | "tools" | "actions";
};

const ITEMS: Product[] = [
  // Products
  { id: "hospital", name: "Hospital OS", sub: "Flagship · v4 Foundation", desc: "The hospital operating system — command center, patient journeys, automations", icon: Building2, accent: "#C98A7A", href: "/hospital", badge: "Flagship", group: "products" },
  { id: "pie", name: "Nexura Predictive", sub: "Predictive Engine", desc: "Predicts disease before it catches you — routine, meals, sleep, air. See the engine run live", icon: BrainCircuit, accent: "#7C3AED", href: "/predictive", badge: "AI", group: "products" },
  { id: "clinic", name: "Clinic OS", sub: "EMR", desc: "HealthPlix-style clinic management", icon: Stethoscope, accent: "#D98B6E", href: "/clinic", badge: "New", group: "products" },
  { id: "pharmacy", name: "Pharmacia", sub: "POS", desc: "AI-powered pharmacy point of sale", icon: Pill, accent: "#F59E0B", href: "/pharmacy", badge: "New", group: "products" },
  { id: "portal", name: "Patient Portal", sub: "Unified Health", desc: "Your health records + blood test at home", icon: HeartPulse, accent: "#0EA5E9", href: "/portal", badge: "New", group: "products" },
  { id: "connect", name: "Nexura Connect", sub: "Communication", desc: "Chat, voice & video for doctor-patient", icon: MessageCircle, accent: "#10B981", href: "/connect", group: "products" },
  { id: "kyh", name: "Know Your Health", sub: "AI Tools", desc: "15 AI health tools — symptoms, derma, diet", icon: Sparkles, accent: "#9DB89E", href: "/know-your-health", group: "products" },
  { id: "global", name: "Nexura Global", sub: "Medical Tourism", desc: "Indian healthcare for international patients", icon: Globe, accent: "#1E40AF", href: "/global", group: "products" },
  { id: "founder", name: "The Founder", sub: "Arpit Nayan", desc: "The story behind Nexura OS — from Bihar to building an operating system", icon: HeartPulse, accent: "#C8A55B", href: "/founder", badge: "Story", group: "products" },

  // Quick actions
  { id: "book", name: "Book Appointment", sub: "Schedule a visit", desc: "Book a doctor appointment", icon: Clock, accent: "#D98B6E", href: "#book", group: "actions" },
  { id: "symptoms", name: "Check Symptoms", sub: "AI triage", desc: "AI-powered symptom checker", icon: Sparkles, accent: "#9DB89E", href: "/know-your-health#symptoms-checker", group: "actions" },
  { id: "connect-doc", name: "Chat with Doctor", sub: "Nexura Connect", desc: "Start a conversation with your doctor", icon: MessageCircle, accent: "#10B981", href: "/connect/patient", group: "actions" },
  { id: "investors", name: "Investor Deck", sub: "Seed Round", desc: "Vision, market, traction, business model, ask", icon: TrendingUp, accent: "#D98B6E", href: "/investors", group: "actions" },
  { id: "pricing", name: "Pricing", sub: "SaaS Plans", desc: "Transparent pricing for hospitals, clinics, pharmacies", icon: TrendingUp, accent: "#E0B080", href: "/pricing", group: "actions" },
  { id: "compliance", name: "Compliance", sub: "Regulatory", desc: "ABDM, DPDP, NABH, CDSCO, IRDAI, GST", icon: Shield, accent: "#9DB89E", href: "/compliance", group: "actions" },
];

export function FeaturesMenu() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { openBooking } = useBooking();

  // Filter items by query
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ITEMS;
    return ITEMS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.sub.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q)
    );
  }, [query]);

  // Group filtered items
  const grouped = useMemo(() => {
    const groups: Record<string, Product[]> = { products: [], actions: [], tools: [] };
    filtered.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [filtered]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIdx(0);
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "/" && !(e.target as HTMLElement)?.matches("input")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[selectedIdx]) {
        e.preventDefault();
        handleSelect(filtered[selectedIdx]);
      }
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, selectedIdx]);

  // Auto-scroll to selected item
  useEffect(() => {
    if (!open || !listRef.current) return;
    const selected = listRef.current.querySelector(`[data-idx="${selectedIdx}"]`);
    selected?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIdx, open]);

  // Auto-focus search when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIdx(0);
    }
  }, [open]);

  const handleSelect = useCallback((item: Product) => {
    setOpen(false);
    if (item.href === "#book") {
      openBooking();
    } else if (item.href.startsWith("#")) {
      // scroll to section
    } else {
      setTimeout(() => { window.location.href = item.href; }, 100);
    }
  }, [openBooking]);

  // Global keyboard shortcut: Cmd+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  let runningIdx = -1;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/* Trigger button — minimal, premium */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
        className="group relative flex items-center gap-1.5 rounded-full border border-border bg-background/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-all hover:border-primary/30 hover:bg-accent/50 hover:text-foreground hover:shadow-sm"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="hidden sm:flex items-center gap-0.5 rounded border border-border bg-muted px-1 py-0.5 font-mono text-[0.5rem] text-muted-foreground/70">
          ⌘K
        </kbd>
      </button>

      <DialogContent className="overflow-hidden border-border bg-background/95 p-0 sm:max-w-[32rem] backdrop-blur-2xl rounded-2xl">
        <DialogTitle className="sr-only">Command Palette</DialogTitle>

        {/* ===== Search input — Linear style ===== */}
        <div className="relative flex items-center border-b border-border">
          <Search className="pointer-events-none absolute left-4 h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products, tools, or actions…"
            className="h-12 w-full bg-transparent pl-11 pr-10 text-sm font-medium outline-none placeholder:text-muted-foreground/60"
            autoFocus
          />
          {query && (
            <button
              onClick={() => { setQuery(""); inputRef.current?.focus(); }}
              className="absolute right-3 grid h-5 w-5 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {/* ===== Results — grouped, keyboard navigable ===== */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <Search className="mx-auto mb-2 h-6 w-6 text-muted-foreground/30" />
              <p className="text-sm text-muted-foreground">No results for "{query}"</p>
              <p className="mt-1 text-xs text-muted-foreground/60">Try searching for "hospital", "blood", or "appointment"</p>
            </div>
          ) : (
            <>
              {grouped.products.length > 0 && (
                <GroupLabel label="Products" />
              )}
              {grouped.products.map((item) => {
                runningIdx++;
                return (
                  <CommandItem
                    key={item.id}
                    item={item}
                    idx={runningIdx}
                    selected={selectedIdx === runningIdx}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setSelectedIdx(runningIdx)}
                  />
                );
              })}

              {grouped.actions.length > 0 && (
                <GroupLabel label="Quick Actions" />
              )}
              {grouped.actions.map((item) => {
                runningIdx++;
                return (
                  <CommandItem
                    key={item.id}
                    item={item}
                    idx={runningIdx}
                    selected={selectedIdx === runningIdx}
                    onSelect={() => handleSelect(item)}
                    onHover={() => setSelectedIdx(runningIdx)}
                  />
                );
              })}
            </>
          )}
        </div>

        {/* ===== Footer — keyboard hints ===== */}
        <div className="flex items-center justify-between border-t border-border bg-muted/30 px-3 py-2 text-[0.6rem] text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[0.55rem]">↑↓</kbd>
              navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[0.55rem]">↵</kbd>
              select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1 py-0.5 font-mono text-[0.55rem]">esc</kbd>
              close
            </span>
          </div>
          <span className="flex items-center gap-1 font-medium">
            <Command className="h-2.5 w-2.5" /> Hospital OS
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Group label ---------- */
function GroupLabel({ label }: { label: string }) {
  return (
    <p className="px-2 py-1.5 text-[0.55rem] font-semibold uppercase tracking-[0.15em] text-muted-foreground/60">
      {label}
    </p>
  );
}

/* ---------- Command item — Linear/Raycast style ---------- */
function CommandItem({
  item,
  idx,
  selected,
  onSelect,
  onHover,
}: {
  item: Product;
  idx: number;
  selected: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      data-idx={idx}
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors",
        selected ? "bg-accent" : "hover:bg-accent/50"
      )}
    >
      <span
        className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-white shadow-sm"
        style={{ background: item.accent }}
      >
        <Icon className="h-3.5 w-3.5" strokeWidth={2.2} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground">
          {item.name}
          {item.badge && (
            <span
              className="rounded-full px-1.5 py-0.5 text-[0.45rem] font-bold uppercase tracking-wider text-white"
              style={{ background: item.accent }}
            >
              {item.badge}
            </span>
          )}
        </p>
        <p className="truncate text-[0.65rem] text-muted-foreground">{item.desc}</p>
      </div>
      {selected && (
        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
  );
}
