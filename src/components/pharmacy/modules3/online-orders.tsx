"use client";
import { Upload, ScanLine, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
export function OnlineOrdersModule() {
  return (
    <div className="space-y-4">
      <div><h1 className="font-serif text-2xl font-semibold text-white">Online Orders</h1><p className="text-sm text-[#6B7280]">Patient uploads prescription → AI reads it → auto-creates order → routes to pharmacy</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#F59E0B]/10 text-[#F59E0B]"><Upload className="h-5 w-5" /></span>
          <h3 className="mt-3 font-serif text-base font-semibold text-white">Patient uploads Rx</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Patient takes photo of prescription → uploads via public link → appears here instantly with "Online" badge</p>
          <button onClick={() => toast.info("Patient portal at /pharmacy/order")} className="mt-3 flex items-center gap-1 text-xs font-medium text-[#F59E0B]">View patient portal <ArrowRight className="h-3 w-3" /></button>
        </div>
        <div className="rounded-2xl border border-[#1E2228] bg-[#111418] p-5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#9DB89E]/10 text-[#9DB89E]"><Sparkles className="h-5 w-5" /></span>
          <h3 className="mt-3 font-serif text-base font-semibold text-white">AI reads prescription</h3>
          <p className="mt-1 text-xs text-[#6B7280]">Claude Vision reads the Rx → extracts medicines → checks Schedule H compliance → matches to inventory → creates bill draft</p>
        </div>
      </div>
      <div className="grid place-items-center rounded-2xl border border-dashed border-[#1E2228] py-12 text-center"><ScanLine className="mb-2 h-10 w-10 text-[#1E2228]" /><p className="text-sm text-[#6B7280]">No online orders yet. Patients can order via the public link.</p></div>
    </div>
  );
}
