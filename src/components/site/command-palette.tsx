"use client";

/* ============================================================
   NEXURA COMMAND PALETTE — ⌘K / Ctrl+K, site-wide
   ------------------------------------------------------------
   One keystroke to anywhere in the OS: every product, every
   quick action, every resource. Liquid Gold styling on the
   shadcn/cmdk primitives — keyboard-first (arrows, enter,
   esc), pointer-friendly, reduced-motion safe.

   Also ships a low-key floating trigger (bottom-right) so the
   palette is discoverable without reading the docs. Hidden on
   print, below the back-to-top button, aria-labelled.
   ============================================================ */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Stethoscope, Pill, HeartPulse, MessageCircle, Sparkles,
  Globe, BrainCircuit, FlaskConical, Sprout, Clock, TrendingUp, Shield,
  Search, ArrowRight, CornerDownLeft, User, Siren,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

type Entry = { id: string; name: string; hint: string; icon: React.ElementType; href: string };

const PRODUCTS: Entry[] = [
  { id: "hospital", name: "Hospital OS", hint: "Flagship · 22-module HMS", icon: Building2, href: "/hospital" },
  { id: "labs", name: "Nexura Labs", hint: "Diagnostics, decoded · home collection", icon: FlaskConical, href: "/labs" },
  { id: "emergency", name: "Nexura Emergency", hint: "SOS dispatch · live ER beds", icon: Siren, href: "/emergency" },
  { id: "predictive", name: "Nexura Predictive", hint: "Health foresight engine", icon: BrainCircuit, href: "/predictive" },
  { id: "clinic", name: "Clinic OS", hint: "EMR · SOAP · drug guard", icon: Stethoscope, href: "/clinic" },
  { id: "pharmacy", name: "Pharmacia", hint: "AI pharmacy POS", icon: Pill, href: "/pharmacy" },
  { id: "portal", name: "Patient Portal", hint: "Unified health record", icon: HeartPulse, href: "/portal" },
  { id: "connect", name: "Nexura Connect", hint: "Doctor-patient chat & calls", icon: MessageCircle, href: "/connect" },
  { id: "kyh", name: "Know Your Health", hint: "15 AI health tools", icon: Sparkles, href: "/know-your-health" },
  { id: "global", name: "Nexura Global", hint: "Medical tourism", icon: Globe, href: "/global" },
  { id: "diy", name: "Nexura DIY", hint: "Free wellness roadmap", icon: Sprout, href: "/diy" },
];

const ACTIONS: Entry[] = [
  { id: "book", name: "Book an appointment", hint: "Multi-step booking", icon: Clock, href: "/#book" },
  { id: "symptoms", name: "Check my symptoms", hint: "AI triage", icon: Sparkles, href: "/know-your-health#symptoms-checker" },
  { id: "chat", name: "Chat with a doctor", hint: "Nexura Connect", icon: MessageCircle, href: "/connect/patient" },
  { id: "labs-book", name: "Book a lab test", hint: "Home collection in 30-min windows", icon: FlaskConical, href: "/labs#book-collection" },
];

const RESOURCES: Entry[] = [
  { id: "pricing", name: "Pricing", hint: "Transparent INR plans", icon: TrendingUp, href: "/pricing" },
  { id: "compliance", name: "Compliance", hint: "ABDM · DPDP · NABH · CDSCO", icon: Shield, href: "/compliance" },
  { id: "founder", name: "The Founder", hint: "Arpit Nayan's story", icon: User, href: "/founder" },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      if (href.startsWith("/#") || href.includes("#")) {
        const [path, hash] = href.split("#");
        if (path && path !== "/" && window.location.pathname !== path) {
          router.push(path + (hash ? `#${hash}` : ""));
          return;
        }
        const el = document.getElementById(hash);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        if (path) router.push(href);
        return;
      }
      router.push(href);
    },
    [router],
  );

  const run = (entry: Entry) => () => go(entry.href);

  return (
    <>
      {/* floating trigger — quiet gold ring, bottom-right */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open command palette (Ctrl+K)"
        className="nx-cmdk-trigger group fixed bottom-5 right-5 z-40 hidden items-center gap-2 rounded-full border border-[#3A3428] bg-[#1D1810]/90 py-2 pl-3 pr-4 text-xs font-medium text-[#C9BFAE] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:border-[#A16207]/70 hover:text-[#F5EDD8] sm:inline-flex print:hidden"
      >
        <Search className="h-3.5 w-3.5 text-[#C8A55B]" aria-hidden="true" />
        <span>Search Nexura</span>
        <kbd className="rounded border border-[#3A3428] bg-[#241F16] px-1.5 py-0.5 font-mono text-[10px] text-[#8A8070] group-hover:text-[#B3A892]">
          ⌘K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} className="nx-cmdk">
        <CommandInput placeholder="Type a product, action or page…" className="nx-cmdk-input" />
        <CommandList className="nx-cmdk-list">
          <CommandEmpty>No matches — try “labs”, “book” or “connect”.</CommandEmpty>

          <CommandGroup heading="Quick actions" className="nx-cmdk-group">
            {ACTIONS.map((a) => (
              <CommandItem key={a.id} value={`${a.name} ${a.hint}`} onSelect={run(a)} className="nx-cmdk-item">
                <a.icon className="mr-2 h-4 w-4 shrink-0 text-[#C8A55B]" aria-hidden="true" />
                <span className="flex-1">{a.name}</span>
                <span className="hidden text-xs text-[#8A8070] sm:inline">{a.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="nx-cmdk-sep" />

          <CommandGroup heading="Products" className="nx-cmdk-group">
            {PRODUCTS.map((p) => (
              <CommandItem key={p.id} value={`${p.name} ${p.hint}`} onSelect={run(p)} className="nx-cmdk-item">
                <p.icon className="mr-2 h-4 w-4 shrink-0 text-[#C8A55B]" aria-hidden="true" />
                <span className="flex-1">{p.name}</span>
                <span className="hidden text-xs text-[#8A8070] sm:inline">{p.hint}</span>
                <ArrowRight className="ml-2 h-3.5 w-3.5 text-[#5E5748]" aria-hidden="true" />
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator className="nx-cmdk-sep" />

          <CommandGroup heading="Resources" className="nx-cmdk-group">
            {RESOURCES.map((r) => (
              <CommandItem key={r.id} value={`${r.name} ${r.hint}`} onSelect={run(r)} className="nx-cmdk-item">
                <r.icon className="mr-2 h-4 w-4 shrink-0 text-[#C8A55B]" aria-hidden="true" />
                <span className="flex-1">{r.name}</span>
                <span className="hidden text-xs text-[#8A8070] sm:inline">{r.hint}</span>
              </CommandItem>
            ))}
          </CommandGroup>

          <div className="border-t border-[#2E2A20] px-4 py-2.5 text-[11px] text-[#6E6654]">
            <CornerDownLeft className="mr-1 inline h-3 w-3" aria-hidden="true" />
            to open · <kbd className="font-mono">esc</kbd> to close · a Nexura OS quick-nav
          </div>
        </CommandList>
      </CommandDialog>
    </>
  );
}
