"use client";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { Loader2, X, Sparkles, RotateCcw, ImagePlus, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function ToolHeader({ title, tagline, icon: Icon, accent, inspiration }: { title:string; tagline:string; icon:any; accent:string; inspiration?:string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-depth ring-1 ring-white/30" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}dd)` }}>
        <Icon className="h-6 w-6" strokeWidth={2.2} />
      </span>
      <div className="flex-1">
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-[#1F1B17]">{title}</h2>
        <p className="text-sm text-[#9A8F84]">{tagline}</p>
        {inspiration && <p className="mt-1 text-[0.6rem] text-[#B5A99E]">Inspired by {inspiration}</p>}
      </div>
    </div>
  );
}

export function RunButton({ onClick, loading, disabled, label="Analyze with AI", accent="#D98B6E" }: { onClick:()=>void; loading:boolean; disabled?:boolean; label?:string; accent?:string }) {
  return (
    <button onClick={onClick} disabled={loading||disabled} className="group flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold text-white shadow-depth transition-all hover:scale-[1.02] hover:shadow-depth-lg disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}>
      {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyzing…</> : <><Sparkles className="h-4 w-4" /> {label}</>}
    </button>
  );
}

export function ToolTextarea({ value, onChange, placeholder, rows=4 }: { value:string; onChange:(v:string)=>void; placeholder?:string; rows?:number }) {
  return <textarea value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} rows={rows} className="glass-input w-full resize-none rounded-xl px-3.5 py-2.5 text-sm outline-none" />;
}

export function ToolInput({ value, onChange, placeholder, type="text" }: { value:string; onChange:(v:string)=>void; placeholder?:string; type?:string }) {
  return <input type={type} value={value} onChange={(e)=>onChange(e.target.value)} placeholder={placeholder} className="glass-input h-11 w-full rounded-xl px-3.5 text-sm outline-none" />;
}

export function ImageUploader({ image, onPick, onClear, accent="#9DB89E", label="Upload image" }: { image:{base64:string;mimeType:string;previewUrl:string}|null; onPick:(img:{base64:string;mimeType:string;previewUrl:string})=>void; onClear:()=>void; accent?:string; label?:string }) {
  const [dragOver, setDragOver] = useState(false);
  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { toast.error("Please upload an image file"); return; }
    if (file.size > 8*1024*1024) { toast.error("Image too large — max 8 MB"); return; }
    const reader = new FileReader();
    reader.onload = () => { const dataUrl = reader.result as string; onPick({ base64:dataUrl.split(",")[1], mimeType:file.type, previewUrl:dataUrl }); };
    reader.readAsDataURL(file);
  }, [onPick]);
  return (
    <div className="space-y-2">
      <label onDragOver={(e)=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={(e)=>{e.preventDefault();setDragOver(false);const f=e.dataTransfer.files?.[0];if(f)handleFile(f);}} className={cn("glass-soft relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 transition-all", dragOver?"border-[#9DB89E] shadow-depth":"border-white/40 hover:border-[#9DB89E]/60 hover:shadow-depth")}>
        {image ? (
          <div className="relative w-full">
            <img src={image.previewUrl} alt="Uploaded" className="mx-auto max-h-56 rounded-xl object-contain shadow-depth" />
            <button type="button" onClick={(e)=>{e.preventDefault();e.stopPropagation();onClear();}} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-[#1F1B17] text-white shadow-depth hover:bg-[#C98A7A]"><X className="h-3.5 w-3.5" /></button>
          </div>
        ) : (
          <>
            <span className="mb-2 grid h-12 w-12 place-items-center rounded-2xl" style={{ background:`${accent}15`, color:accent }}><ImagePlus className="h-6 w-6" /></span>
            <p className="text-sm font-medium text-[#1F1B17]">{label}</p>
            <p className="mt-0.5 text-[0.65rem] text-[#9A8F84]">Drag & drop or click · JPG, PNG, WEBP · max 8 MB</p>
            <input type="file" accept="image/*" className="sr-only" onChange={(e)=>{const f=e.target.files?.[0];if(f)handleFile(f);e.target.value="";}} />
          </>
        )}
      </label>
    </div>
  );
}

export function LoadingResult({ accent="#9DB89E" }: { accent?:string }) {
  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} className="space-y-3">
      <div className="flex items-center gap-2 text-sm text-[#9A8F84]"><Loader2 className="h-4 w-4 animate-spin" style={{color:accent}} />Gemini is analyzing…</div>
      <div className="space-y-2">{[80,100,90,70,95,60,85].map((w,i)=>(<motion.div key={i} initial={{opacity:0,x:-8}} animate={{opacity:1,x:0}} transition={{delay:i*0.15}} className="h-3 rounded-full bg-[#EFE9E0]" style={{width:`${w}%`}} />))}</div>
    </motion.div>
  );
}

export function ResultCard({ children, accent="#9DB89E", title }: { children:React.ReactNode; accent?:string; title?:string }) {
  return (
    <motion.div initial={{opacity:0,y:10}} animate={{opacity:1,y:0}} className="overflow-hidden rounded-2xl glass-soft shadow-depth">
      {title && <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-white" style={{ background:`linear-gradient(135deg, ${accent}, ${accent}cc)` }}><Sparkles className="h-3.5 w-3.5" />{title}</div>}
      <div className="p-4">{children}</div>
    </motion.div>
  );
}

export function SeverityBadge({ level }: { level:"low"|"moderate"|"high"|"emergency"|"normal"|"info" }) {
  const styles: Record<string,{bg:string;text:string;label:string}> = { low:{bg:"#9DB89E15",text:"#5A7A5B",label:"Low"}, moderate:{bg:"#E0B08015",text:"#B8893D",label:"Moderate"}, high:{bg:"#C98A7A15",text:"#9A6A5A",label:"High"}, emergency:{bg:"#C98A7A20",text:"#7A4A3A",label:"Emergency"}, normal:{bg:"#9DB89E15",text:"#5A7A5B",label:"Normal"}, info:{bg:"#7A9A7B15",text:"#4A6A4B",label:"Info"} };
  const s = styles[level] || styles.info;
  return <span className="rounded-full px-2.5 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider" style={{ background:s.bg, color:s.text }}>{s.label}</span>;
}

export function Disclaimer() {
  return (
    <div className="glass-soft flex items-start gap-2 rounded-xl px-3.5 py-2.5 text-[0.65rem] text-[#9A8F84]">
      <ShieldCheck className="mt-0.5 h-3 w-3 shrink-0 text-[#9DB89E]" />
      <p>Nexa AI is informational only and not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified doctor for health concerns. Powered by Google Gemini. Indian-context reference ranges from ICMR, NFHS-5, and ICMR-INDIAB.</p>
    </div>
  );
}

export function ResetButton({ onClick }: { onClick:()=>void }) {
  return <button onClick={onClick} className="flex items-center gap-1.5 rounded-full glass-chip px-3 py-1.5 text-xs font-medium text-[#5C544D] transition-all hover:scale-105"><RotateCcw className="h-3 w-3" /> Start over</button>;
}

export function showError(msg?: string) { toast.error(msg || "AI request failed — please try again"); }
