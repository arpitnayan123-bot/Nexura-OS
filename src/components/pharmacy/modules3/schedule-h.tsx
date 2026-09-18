"use client";
import { useEffect, useState } from "react";
import { ShieldAlert, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
export function ScheduleHModule() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/pharmacy/schedule-h")
      .then((r) => r.json())
      .then((d) => setEntries(d.entries || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);
  const exportCsv = () => {
    const h = [
      "Sl No",
      "Date",
      "Patient",
      "Address",
      "Phone",
      "Doctor",
      "Reg No",
      "Rx Date",
      "Medicine",
      "Batch",
      "Qty",
      "Sch",
    ];
    const rows = entries.map((e) => [
      e.serialNo,
      new Date(e.saleDate).toLocaleDateString("en-IN"),
      `"${e.patientName}"`,
      `"${e.patientAddress || ""}"`,
      e.patientPhone || "",
      `"${e.doctorName}"`,
      e.doctorRegNo,
      e.prescriptionDate,
      `"${e.medicineName}"`,
      e.batchNo || "",
      e.qtyStrips,
      e.schedule,
    ]);
    const csv = [h.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const b = new Blob([csv], { type: "text/csv" });
    const u = URL.createObjectURL(b);
    const a = document.createElement("a");
    a.href = u;
    a.download = `schedule-h-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(u);
    toast.success("Register exported");
  };
  if (loading)
    return (
      <div className="grid h-40 place-items-center">
        <Loader2 className="h-5 w-5 animate-spin text-[#828894]" />
      </div>
    );
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-2xl font-semibold text-white">Schedule H Register</h1>
          <p className="text-sm text-[#828894]">
            {entries.length} entries · Drug Inspector audit format
          </p>
        </div>
        <button
          onClick={exportCsv}
          className="flex items-center gap-1.5 rounded-full bg-[#F59E0B] px-4 py-2 text-xs font-bold text-black hover:bg-[#D97706]"
        >
          <Download className="h-3.5 w-3.5" />
          Export CSV
        </button>
      </div>
      <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-xs text-red-300">
        <ShieldAlert className="mr-1 inline h-3.5 w-3.5" />
        Mandatorily maintained per Drugs &amp; Cosmetics Rules 1945, Rule 65. Produced on demand
        during Drug Inspector audits.
      </div>
      <div className="overflow-hidden rounded-2xl border border-[#1E2228] bg-[#111418]">
        <div className="max-h-[65vh] overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#0D0F12]">
              <tr className="text-left text-[0.6rem] uppercase tracking-wider text-[#828894]">
                <th className="p-2 font-medium">Sl</th>
                <th className="p-2 font-medium">Date</th>
                <th className="p-2 font-medium">Patient</th>
                <th className="p-2 font-medium">Doctor</th>
                <th className="p-2 font-medium">Rx Date</th>
                <th className="p-2 font-medium">Medicine</th>
                <th className="p-2 text-center font-medium">Qty</th>
                <th className="p-2 font-medium">Sch</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-b border-[#1A1D22] hover:bg-[#0D0F12]">
                  <td className="p-2 font-mono text-[#828894]">{e.serialNo}</td>
                  <td className="p-2 text-white">
                    {new Date(e.saleDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })}
                  </td>
                  <td className="p-2">
                    <p className="font-medium text-white">{e.patientName}</p>
                    <p className="text-[0.6rem] text-[#828894]">
                      {e.patientAddress}
                      {e.patientPhone ? ` · ${e.patientPhone}` : ""}
                    </p>
                  </td>
                  <td className="p-2">
                    <p className="font-medium text-white">{e.doctorName}</p>
                    <p className="text-[0.6rem] text-[#828894]">Reg: {e.doctorRegNo}</p>
                  </td>
                  <td className="p-2 text-white">{e.prescriptionDate}</td>
                  <td className="p-2">
                    <p className="font-medium text-white">{e.medicineName}</p>
                    <p className="text-[0.6rem] text-[#828894]">Batch: {e.batchNo || "—"}</p>
                  </td>
                  <td className="p-2 text-center text-white tabular-nums">{e.qtyStrips}</td>
                  <td className="p-2">
                    <span className="rounded bg-red-500/15 px-1 py-0.5 text-[0.55rem] font-bold text-red-400">
                      {e.schedule}
                    </span>
                  </td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-[#828894]">
                    No entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
