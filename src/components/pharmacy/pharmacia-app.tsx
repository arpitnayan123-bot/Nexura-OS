// @ts-nocheck
"use client";

import { useState, useTransition, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ShoppingCart, Boxes, PackagePlus, Truck, Users,
  ShieldAlert, BarChart3, Settings, ArrowLeft,
  Wifi, Loader2, Pill,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CreditsFooter } from "./credits-footer";

const BillingModule = dynamic(() => import("./modules3/billing").then((m) => m.BillingModule));
const InventoryModule = dynamic(() => import("./modules3/inventory").then((m) => m.InventoryModule));
const PurchasesModule = dynamic(() => import("./modules3/purchases").then((m) => m.PurchasesModule));
const SuppliersModule = dynamic(() => import("./modules3/suppliers").then((m) => m.SuppliersModule));
const CustomersModule = dynamic(() => import("./modules3/customers").then((m) => m.CustomersModule));
const ScheduleHModule = dynamic(() => import("./modules3/schedule-h").then((m) => m.ScheduleHModule));
const ReportsModule = dynamic(() => import("./modules3/reports").then((m) => m.ReportsModule));
const SettingsModule = dynamic(() => import("./modules3/settings").then((m) => m.SettingsModule));

type ModuleId = "billing" | "inventory" | "purchases" | "suppliers" | "customers" | "schedule-h" | "reports" | "settings";

const NAV: { id: ModuleId; label: string; icon: React.ComponentType<{ className?: string }>; short: string }[] = [
  { id: "billing", label: "Billing", icon: ShoppingCart, short: "Bill" },
  { id: "inventory", label: "Inventory", icon: Boxes, short: "Inv" },
  { id: "purchases", label: "Purchases", icon: PackagePlus, short: "Pur" },
  { id: "suppliers", label: "Suppliers", icon: Truck, short: "Sup" },
  { id: "customers", label: "Customers", icon: Users, short: "Cus" },
  { id: "schedule-h", label: "Schedule H", icon: ShieldAlert, short: "SchH" },
  { id: "reports", label: "Reports", icon: BarChart3, short: "Rep" },
  { id: "settings", label: "Settings", icon: Settings, short: "Set" },
];

export function PharmaciaApp() {
  const [active, setActive] = useState<ModuleId>("billing");
  const [pending, startTransition] = useTransition();
  const [miniData, setMiniData] = useState({ sales: 0, cash: 0, upi: 0, credit: 0, lowStock: 0 });
  const [online, setOnline] = useState(true);

  const switchModule = useCallback((id: ModuleId) => {
    startTransition(() => setActive(id));
  }, []);

  // mini-dashboard strip — fetch today's stats
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const res = await fetch("/api/pharmacy/day-closing");
        if (!res.ok) return;
        const d = await res.json();
        if (!active) return;
        setMiniData({
          sales: d.totalSales || 0,
          cash: d.cashSales || 0,
          upi: d.upiSales || 0,
          credit: d.creditSales || 0,
          lowStock: 0,
        });
      } catch { /* keep defaults */ }
    };
    load();
    const id = setInterval(load, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    on();
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", on); };
  }, []);

  return (
    <div className="flex min-h-screen bg-[#0D0F12] text-white">
      {/* champagne ambient wash behind the shell */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute -top-40 right-[-8%] h-96 w-[38rem] rounded-full opacity-25 blur-3xl anim-aurora" style={{ background: "radial-gradient(circle, rgba(232,176,75,0.35), transparent 65%)" }} />
        <div className="absolute bottom-[-20%] left-[8%] h-80 w-96 rounded-full opacity-15 blur-3xl anim-aurora" style={{ background: "radial-gradient(circle, rgba(217,184,124,0.3), transparent 65%)", animationDelay: "-9s" }} />
      </div>
      {/* Fixed left sidebar */}
      <aside className="sticky top-0 z-30 flex h-screen w-16 shrink-0 flex-col items-center border-r border-[#1E2228] bg-[#0D0F12]/95 backdrop-blur-xl py-4 lg:w-56">
        {/* Pharmacy name + live dot */}
        <Link href="/" className="mb-6 flex items-center gap-2 px-2 lg:px-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#E8B04B] via-[#D99A2B] to-[#B87A10] shadow-lg shadow-[#E8B04B]/25 ring-1 ring-white/20 ring-inset anim-breathe">
            <Pill className="h-4 w-4 text-white" strokeWidth={2.4} />
          </span>
          <div className="hidden leading-none lg:block">
            <h1 className="font-serif text-sm font-semibold">Nexura Pharmacia</h1>
            <div className="mt-0.5 flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", online ? "bg-[#22C55E] animate-pulse" : "bg-red-500")} />
              <span className="text-[0.55rem] text-[#828894]">{online ? "Live" : "Offline"}</span>
            </div>
          </div>
        </Link>

        {/* Nav links */}
        <nav className="flex flex-1 flex-col gap-1 px-2 lg:w-full lg:px-3">
          {NAV.map((item) => {
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => switchModule(item.id)}
                title={item.label}
                className={cn(
                  "group relative flex items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-all lg:px-3",
                  isActive
                    ? "bg-[#E8B04B]/10 text-[#E8B04B]"
                    : "text-[#828894] hover:bg-[#1E2228] hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.9} />
                <span className="hidden text-[13px] font-medium lg:block">{item.label}</span>
                {isActive && (
                  <motion.span
                    layoutId="pharm-nav"
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[#E8B04B] shadow-[0_0_8px_rgba(232,176,75,0.6)]"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Exit */}
        <Link href="/" className="mt-auto flex items-center gap-3 rounded-xl px-2 py-2.5 text-[#828894] transition-colors hover:bg-[#1E2228] hover:text-white lg:px-3">
          <ArrowLeft className="h-[18px] w-[18px]" strokeWidth={1.9} />
          <span className="hidden text-[13px] font-medium lg:block">Homepage</span>
        </Link>
      </aside>

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mini-dashboard strip — champagne glass with gold hairline */}
        <div className="sticky top-0 z-20 relative flex items-center gap-3 border-b border-[#1E2228] bg-[#111418]/90 px-4 py-2.5 backdrop-blur-xl lg:px-6">
          <div aria-hidden className="hairline-gold pointer-events-none absolute inset-x-0 bottom-0 opacity-60" />
          <MiniStat label="Today's Sales" value={`₹${miniData.sales.toLocaleString("en-IN")}`} color="#F59E0B" />
          <MiniStat label="Cash" value={`₹${miniData.cash.toLocaleString("en-IN")}`} color="#22C55E" />
          <MiniStat label="UPI" value={`₹${miniData.upi.toLocaleString("en-IN")}`} color="#3B82F6" />
          <MiniStat label="Credit" value={`₹${miniData.credit.toLocaleString("en-IN")}`} color="#EF4444" />
          <MiniStat label="Low Stock" value={String(miniData.lowStock)} color="#F59E0B" />
          <div className="ml-auto flex items-center gap-1.5 text-[0.65rem] text-[#828894]">
            <Wifi className={cn("h-3.5 w-3.5", online ? "text-[#22C55E]" : "text-red-500")} />
            <span className="hidden sm:inline">{online ? "Real-time sync" : "Offline — auto-sync on reconnect"}</span>
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            >
              {pending ? (
                <div className="grid h-64 place-items-center">
                  <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-[#E8B04B]" />
                    <p className="text-xs text-[#828894]">Loading module…</p>
                  </div>
                </div>
              ) : active === "billing" ? (
                <BillingModule />
              ) : active === "inventory" ? (
                <InventoryModule />
              ) : active === "purchases" ? (
                <PurchasesModule />
              ) : active === "suppliers" ? (
                <SuppliersModule />
              ) : active === "customers" ? (
                <CustomersModule />
              ) : active === "schedule-h" ? (
                <ScheduleHModule />
              ) : active === "reports" ? (
                <ReportsModule />
              ) : (
                <SettingsModule />
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Credits footer */}
        <CreditsFooter />
      </div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="hidden text-[0.6rem] uppercase tracking-wide text-[#828894] sm:inline">{label}</span>
      <span className="text-xs font-bold tabular-nums" style={{ color }}>{value}</span>
    </div>
  );
}
