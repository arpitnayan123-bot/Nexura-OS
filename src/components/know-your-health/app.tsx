"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Search, X, ShieldCheck, Sparkles, HeartPulse, ChevronRight, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOLS, TOOLS_BY_ID, CATEGORY_LABEL, type ToolCategory } from "./tools";
import { LazyTool } from "./lazy-tools";
import { PreventionSchedule } from "./prevention-schedule";

export function KnowYourHealthApp() {
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ToolCategory | "all">("all");

  useEffect(() => {
    const onHash = () => {
      const h = window.location.hash.replace(/^#/, "");
      if (h && TOOLS_BY_ID[h]) setActiveToolId(h);
      else setActiveToolId(null);
    };
    onHash();
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (id: string | null) => {
    if (id) window.location.hash = id;
    else history.replaceState(null, "", window.location.pathname);
    setActiveToolId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOLS.filter((t) => {
      if (filter !== "all" && t.category !== filter) return false;
      if (!q) return true;
      return t.name.toLowerCase().includes(q) || t.tagline.toLowerCase().includes(q) || t.description.toLowerCase().includes(q);
    });
  }, [query, filter]);

  const activeTool = activeToolId ? TOOLS_BY_ID[activeToolId] : null;

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F1B17] mesh-bg">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#9DB89E]/15 blur-3xl anim-aurora" />
        <div className="absolute top-1/3 -right-32 h-80 w-80 rounded-full bg-[#D98B6E]/12 blur-3xl anim-aurora" style={{ animationDelay:"-8s" }} />
        <div className="absolute -bottom-32 left-1/4 h-72 w-72 rounded-full bg-[#E0B080]/12 blur-3xl anim-aurora" style={{ animationDelay:"-16s" }} />
      </div>

      <header className="glass-premium sticky top-0 z-40">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#5C544D] transition-all hover:text-[#1F1B17] hover:scale-105"><ArrowLeft className="h-3.5 w-3.5" /> Home</Link>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#9DB89E] to-[#7A9A7B] text-white shadow-md ring-1 ring-white/30"><HeartPulse className="h-4.5 w-4.5" strokeWidth={2.2} /></span>
            <div className="leading-none"><p className="font-serif text-base font-semibold tracking-tight">Know Your Health</p><p className="text-[0.55rem] uppercase tracking-[0.18em] text-[#9A8F84]">AI Tools · Gemini Powered</p></div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="hidden items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#5A7A5B] sm:flex"><ShieldCheck className="h-3.5 w-3.5" /> Secure · server-side</span>
            <span className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#A55A4A]"><Sparkles className="h-3.5 w-3.5" aria-hidden="true" /> {TOOLS.length} tools</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        <AnimatePresence mode="wait">
          {activeTool ? (
            <motion.div key={activeTool.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:0.2}}>
              <button onClick={() => go(null)} className="mb-4 flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#5C544D] transition-all hover:text-[#1F1B17] hover:scale-105"><ArrowLeft className="h-3.5 w-3.5" /> Back to all tools</button>
              <LazyTool toolId={activeTool.id} />
            </motion.div>
          ) : (
            <motion.div key="landing" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.2}} className="space-y-6">
              <div className="relative overflow-hidden rounded-3xl mesh-bg-dark p-6 text-white shadow-depth-lg sm:p-10">
                <div className="pointer-events-none absolute inset-0 glass-dark" style={{ borderRadius:"inherit" }} />
                <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-[#9DB89E]/30 blur-3xl anim-breathe" />
                <div className="pointer-events-none absolute -bottom-12 -left-12 h-40 w-40 rounded-full bg-[#D98B6E]/30 blur-3xl anim-aurora" />
                {/* champagne aurora heart — Liquid Gold signature */}
                <div aria-hidden className="aurora-gold right-[-6%] top-[-30%] h-72 w-96 opacity-40" style={{ animationDelay: "-4s" }} />
                <div className="relative max-w-2xl">
                  <span className="badge-lux bg-white/10 text-[#EED9A8] text-[0.65rem] font-semibold uppercase tracking-wider"><Sparkles className="h-3 w-3 text-[#D9B87C]" /> Powered by Google Gemini</span>
                  <h1 className="title-lux mt-3 text-3xl sm:text-4xl">Know your health,<br /><span className="text-gold-gradient">before it knows you.</span></h1>
                  <p className="mt-3 max-w-lg text-sm text-white/80 sm:text-base">{TOOLS.length} AI health tools built for India — analyse your lab report, scan a skin concern, estimate your 10-year disease risk, plan an Indian diet, and more. All processed securely on the server. Educational tools: they offer information and signals, never a medical diagnosis.</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    <button onClick={() => go("symptoms-checker")} className="btn-gold h-10 rounded-full px-4 text-sm font-semibold">Try Symptom Checker <ArrowRight className="h-3.5 w-3.5" /></button>
                    <button onClick={() => go("lab-analyzer")} className="btn-glass-lux h-10 rounded-full border-white/25 bg-white/10 px-4 text-sm font-medium text-white"><span className="flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5" /> Analyze a lab report</span></button>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9A8F84]" />
                  <input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search tools…" className="glass-input h-11 w-full rounded-full pl-11 pr-9 text-sm outline-none" />
                  {query && <button onClick={()=>setQuery("")} className="absolute right-3 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-full glass-chip text-[#9A8F84]"><X className="h-3 w-3" /></button>}
                </div>
                <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {(["all","analyze","scan","manage","learn"] as const).map((c)=>(
                    <button key={c} onClick={()=>setFilter(c)} className={cn("shrink-0 rounded-full px-3.5 py-2 text-xs font-medium transition-all", filter===c?"bg-[#1F1B17] text-white shadow-depth":"glass-chip text-[#5C544D] hover:scale-105")}>{c==="all"?"All tools":CATEGORY_LABEL[c]}</button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((tool, i) => {
                  const Icon = tool.icon;
                  return (
                    <motion.button key={tool.id} initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} transition={{delay:i*0.04}} whileHover={{y:-4,scale:1.02}} onClick={()=>go(tool.id)} className="group relative flex flex-col overflow-hidden rounded-2xl glass-premium p-5 text-left transition-shadow hover:shadow-depth-lg">
                      <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-70" style={{ background:tool.accent }} />
                      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"><div className="absolute -inset-x-1/2 -top-1/2 h-full w-1/2 rotate-12 bg-gradient-to-r from-transparent via-white/20 to-transparent anim-shimmer" /></div>
                      <div className="relative flex items-start justify-between">
                        <span className="grid h-11 w-11 place-items-center rounded-xl text-white shadow-depth ring-1 ring-white/30" style={{ background:tool.gradient }}><Icon className="h-5 w-5" strokeWidth={2.2} /></span>
                        {tool.vision && <span className="rounded-full glass-chip px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-wider text-[#5A7A5B]">Vision</span>}
                      </div>
                      <p className="relative mt-3 font-serif text-base font-semibold text-[#1F1B17]">{tool.name}</p>
                      <p className="relative text-xs text-[#9A8F84]">{tool.tagline}</p>
                      <p className="relative mt-2 text-[0.7rem] leading-relaxed text-[#5C544D] line-clamp-3">{tool.description}</p>
                      <div className="relative mt-3 flex items-center justify-between border-t border-[#EFE9E0]/70 pt-3">
                        <span className="text-[0.55rem] text-[#B5A99E]">{tool.poweredBy}</span>
                        <span className="flex items-center gap-0.5 text-[0.65rem] font-semibold transition-transform group-hover:translate-x-1" style={{ color:tool.accent }}>Open <ChevronRight className="h-3 w-3" /></span>
                      </div>
                    </motion.button>
                  );
                })}
                {filtered.length===0 && <div className="col-span-full rounded-2xl glass-soft py-12 text-center"><Search className="mx-auto mb-2 h-8 w-8 text-[#9A8F84]/30" /><p className="text-sm text-[#9A8F84]">No tools match "{query}".</p></div>}
              </div>

              <div className="glass-soft rounded-2xl p-5 sm:p-6">
                <p className="eyebrow text-[0.625rem]">How these tools work</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#FAF7F2]/60 p-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#9DB89E]/20 text-[0.65rem] font-bold text-[#5A7A5B]">1</span>
                    <p className="mt-2 text-xs font-semibold text-[#1F1B17]">Share your input</p>
                    <p className="mt-1 text-[0.7rem] leading-relaxed text-[#5C544D]">Type your details, fill a short form, or upload a photo — whichever the tool asks for.</p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7F2]/60 p-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#E0B080]/20 text-[0.65rem] font-bold text-[#B8893D]">2</span>
                    <p className="mt-2 text-xs font-semibold text-[#1F1B17]">AI analyses it server-side</p>
                    <p className="mt-1 text-[0.7rem] leading-relaxed text-[#5C544D]">Gemini reviews your input against Indian clinical reference ranges (ICMR, ICMR-INDIAB, ACC/AHA) in an Indian care context.</p>
                  </div>
                  <div className="rounded-xl bg-[#FAF7F2]/60 p-3">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#C98A7A]/20 text-[0.65rem] font-bold text-[#9A6A5A]">3</span>
                    <p className="mt-2 text-xs font-semibold text-[#1F1B17]">Get educational guidance</p>
                    <p className="mt-1 text-[0.7rem] leading-relaxed text-[#5C544D]">Plain-English results with practical steps — and a clear flag when it's time to see a doctor.</p>
                  </div>
                </div>
              </div>

              <PreventionSchedule />

              <div className="glass-soft rounded-2xl p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-[0.65rem] text-[#9A8F84]"><Lock className="h-3 w-3 shrink-0" aria-hidden="true" /> All AI calls are processed securely on our server using Google Gemini. Your image/text data is not stored by this app — it is sent only to the Gemini API to generate your result. Every tool here is educational: outputs are informational estimates and signals, not medical advice, diagnosis, or treatment. Always consult a qualified doctor.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
