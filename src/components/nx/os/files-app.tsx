"use client";

import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ClipboardList,
  FileText,
  FileWarning,
  FlaskConical,
  FolderOpen,
  LayoutGrid,
  List,
  RotateCcw,
  Search,
  Trash2,
  UserRound,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "./toast";
import { timeAgo, useNx } from "../client";
import { useBackLayer } from "./back";
import type { AppCtx } from "./registry";

/* ============================================================
   HOSPITAL OS — Files
   A document manager over live hospital data: patient dossiers,
   orders with results, and the daily census report. Deleted
   documents land in Trash with one-step Undo.
   ============================================================ */

type FileKind = "record" | "order" | "report";

interface NxFile {
  id: string;
  name: string;
  kind: FileKind;
  sub: string;
  ts: number;
  data: Record<string, unknown>;
  patientId?: string;
}

const FOLDERS = [
  { key: "all", label: "All documents", icon: FolderOpen },
  { key: "record", label: "Patient records", icon: UserRound },
  { key: "order", label: "Orders & results", icon: ClipboardList },
  { key: "report", label: "Reports", icon: FileText },
  { key: "trash", label: "Trash", icon: Trash2 },
] as const;

type FolderKey = (typeof FOLDERS)[number]["key"];

const FILE_ICONS: Record<FileKind, React.ComponentType<{ className?: string }>> = {
  record: UserRound,
  order: FlaskConical,
  report: FileText,
};

export function FilesApp({ ctx }: { ctx: AppCtx }) {
  const [folder, setFolder] = useState<FolderKey>("all");
  const [q, setQ] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selected, setSelected] = useState<string | null>(null);
  const [trashed, setTrashed] = useState<string[]>([]);

  const { data: patientsRes, error: patientsErr } = useNx<{
    patients: Array<{
      id: string;
      fullName: string;
      uhid: string;
      currentLocation: string | null;
      isAdmitted: boolean;
    }>;
  }>("/api/nx/patients?take=14");
  const { data: ordersRes, error: ordersErr } = useNx<{
    orders: Array<{
      id: string;
      patient: { fullName: string; uhid: string };
      doctor?: string;
      type: string;
      priority: string;
      status: string;
      at: string;
      results: Array<{ test: string; value: string; unit: string; flag: string }>;
    }>;
  }>("/api/nx/orders");
  const { data: overview } = useNx<{
    census?: {
      total?: number;
      occupancyPct?: number;
      dischargesToday?: number;
      admissionsToday?: number;
    };
    hospital?: { name?: string };
    critical?: { openTasks?: number; openIncidents?: number };
  }>("/api/nx/overview", { pollMs: 120000 });

  const files = useMemo<NxFile[]>(() => {
    const list: NxFile[] = [];
    for (const p of patientsRes?.patients ?? []) {
      list.push({
        id: `rec-${p.id}`,
        name: `Dossier — ${p.fullName}`,
        kind: "record",
        sub: p.uhid,
        ts: Date.now() - 1000 * 60 * 12,
        patientId: p.id,
        data: {
          Patient: p.fullName,
          UHID: p.uhid,
          Location: p.currentLocation || "Outpatient",
          Status: p.isAdmitted ? "Admitted" : "Ambulatory",
          Type: "Universal record",
        },
      });
    }
    for (const o of ordersRes?.orders ?? []) {
      const critical = o.results.some((r) => r.flag === "critical");
      list.push({
        id: `ord-${o.id}`,
        name: `${critical ? "Critical result" : "Order"} — ${o.patient.fullName}`,
        kind: "order",
        sub: `${o.type} · ${o.status.replace("_", " ")}`,
        ts: new Date(o.at).getTime(),
        data: {
          Patient: o.patient.fullName,
          UHID: o.patient.uhid,
          Type: o.type,
          Priority: o.priority,
          Status: o.status.replace("_", " "),
          Doctor: o.doctor || "—",
          Results: o.results.length
            ? o.results.map((r) => `${r.test}: ${r.value}${r.unit || ""} (${r.flag})`).join("\n")
            : "pending",
        },
      });
    }
    if (overview?.census) {
      list.push({
        id: "rpt-census",
        name: `Daily census — ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`,
        kind: "report",
        sub: overview.hospital?.name || "Hospital report",
        ts: Date.now() - 1000 * 60 * 47,
        data: {
          Hospital: overview.hospital?.name || "—",
          "Census (inpatients)": overview.census.total ?? "—",
          Occupancy:
            overview.census.occupancyPct != null ? `${overview.census.occupancyPct}%` : "—",
          "Critical tasks": overview.critical?.openTasks ?? 0,
          "Open incidents": overview.critical?.openIncidents ?? 0,
        },
      });
    }
    return list.sort((a, b) => b.ts - a.ts);
  }, [patientsRes, ordersRes, overview]);

  const visible = useMemo(() => {
    let list =
      trashed.length && folder === "trash"
        ? files.filter((f) => trashed.includes(f.id))
        : files.filter((f) => !trashed.includes(f.id));
    if (folder !== "all" && folder !== "trash") list = list.filter((f) => f.kind === folder);
    const s = q.trim().toLowerCase();
    if (s) list = list.filter((f) => `${f.name} ${f.sub}`.toLowerCase().includes(s));
    return list;
  }, [files, folder, q, trashed]);

  const selectedFile = visible.find((f) => f.id === selected) ?? null;

  /* the open document preview is one step back */
  useBackLayer(Boolean(selectedFile), "files", "Documents", () => setSelected(null));

  const trashFile = (f: NxFile) => {
    setTrashed((t) => [...t, f.id]);
    if (selected === f.id) setSelected(null);
    toast(`“${f.name.length > 26 ? f.name.slice(0, 26) + "…" : f.name}” moved to Trash`, {
      description: "Documents in Trash can be restored anytime.",
      action: { label: "Undo", onClick: () => setTrashed((t) => t.filter((id) => id !== f.id)) },
    });
  };

  const counts = {
    record: files.filter((f) => f.kind === "record" && !trashed.includes(f.id)).length,
    order: files.filter((f) => f.kind === "order" && !trashed.includes(f.id)).length,
    report: files.filter((f) => f.kind === "report" && !trashed.includes(f.id)).length,
  };

  return (
    <div className="flex h-full min-h-0">
      {/* sidebar */}
      <nav
        className="nx-scroll w-48 shrink-0 overflow-y-auto border-r border-line p-3"
        aria-label="Folders"
      >
        {FOLDERS.map((f) => (
          <button
            key={f.key}
            onClick={() => {
              setFolder(f.key);
              setSelected(null);
            }}
            aria-current={folder === f.key ? "page" : undefined}
            className={cn(
              "mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] transition",
              folder === f.key
                ? "bg-accent-soft font-medium text-accent"
                : "text-ink-2 hover:bg-inset hover:text-ink",
            )}
          >
            <f.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">{f.label}</span>
            {f.key === "trash" && trashed.length > 0 && (
              <span className="rounded-full bg-crit-soft px-1.5 text-[10px] font-bold text-crit">
                {trashed.length}
              </span>
            )}
          </button>
        ))}
        <div className="mt-4 border-t border-line px-3 pt-3 text-[11px] leading-relaxed text-ink-4">
          Documents are generated live from hospital data — nothing is stored outside the record
          system.
          {patientsErr && <p className="mt-1 text-warn">Records need Patients access.</p>}
          {ordersErr && <p className="mt-1 text-warn">Orders need Orders access.</p>}
        </div>
      </nav>

      {/* list column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex flex-none items-center gap-2 border-b border-line px-4 py-2.5">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
              className="w-full rounded-lg border border-line bg-inset py-1.5 pl-8 pr-3 text-[12.5px] text-ink outline-none placeholder:text-ink-4 focus:border-accent-line"
            />
          </div>
          <span className="text-[11px] text-ink-4">
            {visible.length} document{visible.length === 1 ? "" : "s"}
          </span>
          <div className="ml-auto flex rounded-lg border border-line bg-inset p-0.5">
            {(
              [
                ["grid", LayoutGrid],
                ["list", List],
              ] as const
            ).map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => setView(v)}
                aria-label={`${v} view`}
                aria-pressed={view === v}
                className={cn(
                  "rounded-md px-2 py-1",
                  view === v ? "bg-panel-3 text-ink" : "text-ink-4 hover:text-ink-2",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        <div className="nx-scroll min-h-0 flex-1 overflow-y-auto p-3">
          {visible.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <FolderOpen className="h-8 w-8 text-ink-4" />
              <p className="mt-3 text-[13.5px] font-medium text-ink-2">
                {folder === "trash" ? "Trash is empty" : "No documents here"}
              </p>
              <p className="mt-1 max-w-xs text-[12px] text-ink-4">
                {folder === "trash"
                  ? "Deleted documents rest here until you restore them."
                  : patientsErr || ordersErr
                    ? "Some sources need module access — ask an administrator."
                    : "Try a different folder or search."}
              </p>
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
              {visible.map((f) => (
                <FileCard
                  key={f.id}
                  file={f}
                  selected={selected === f.id}
                  onSelect={() => setSelected(f.id)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-line">
              {visible.map((f, i) => (
                <FileRow
                  key={f.id}
                  file={f}
                  selected={selected === f.id}
                  onSelect={() => setSelected(f.id)}
                  zebra={i % 2 === 1}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* preview pane */}
      {selectedFile && (
        <FilePreview
          file={selectedFile}
          onClose={() => setSelected(null)}
          onTrash={() => trashFile(selectedFile)}
          onRestore={() => {
            setTrashed((t) => t.filter((id) => id !== selectedFile.id));
            toast("Document restored");
          }}
          inTrash={trashed.includes(selectedFile.id)}
          ctx={ctx}
        />
      )}
    </div>
  );
}

function FileCard({
  file,
  selected,
  onSelect,
}: {
  file: NxFile;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = FILE_ICONS[file.kind];
  return (
    <button
      onClick={onSelect}
      data-sel={selected}
      className={cn(
        "nx-file-row flex flex-col items-start gap-2.5 rounded-2xl border p-3.5 text-left transition",
        selected
          ? "border-accent-line bg-accent-soft"
          : "border-line bg-panel hover:border-line-2 hover:bg-panel-2",
      )}
      aria-pressed={selected}
    >
      <span className="nx-file-tile">
        <Icon className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-medium text-ink">{file.name}</span>
        <span className="mt-0.5 block truncate text-[11px] text-ink-4">
          {file.sub} · {timeAgo(new Date(file.ts))}
        </span>
      </span>
    </button>
  );
}

function FileRow({
  file,
  selected,
  onSelect,
  zebra,
}: {
  file: NxFile;
  selected: boolean;
  onSelect: () => void;
  zebra: boolean;
}) {
  const Icon = FILE_ICONS[file.kind];
  return (
    <button
      onClick={onSelect}
      data-sel={selected}
      className={cn(
        "nx-file-row flex w-full items-center gap-3 px-3.5 py-2.5 text-left",
        !selected && (zebra ? "bg-inset/40" : "bg-panel"),
        selected ? "bg-accent-soft" : "hover:bg-panel-2",
      )}
      aria-pressed={selected}
    >
      <Icon className="h-4 w-4 shrink-0 text-accent" />
      <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{file.name}</span>
      <span className="hidden w-44 truncate text-[11px] text-ink-4 sm:block">{file.sub}</span>
      <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-ink-4">
        {timeAgo(new Date(file.ts))}
      </span>
    </button>
  );
}

function FilePreview({
  file,
  onClose,
  onTrash,
  onRestore,
  inTrash,
  ctx,
}: {
  file: NxFile;
  onClose: () => void;
  onTrash: () => void;
  onRestore: () => void;
  inTrash: boolean;
  ctx: AppCtx;
}) {
  const Icon = FILE_ICONS[file.kind];
  const critical = file.name.startsWith("Critical");
  return (
    <aside
      className="nx-scroll w-72 shrink-0 overflow-y-auto border-l border-line bg-panel-2 p-5"
      aria-label="Document preview"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="nx-back-tb"
            aria-label="Back to Documents"
            title="Back to Documents"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
          </button>
          <span
            className={cn("nx-file-tile", critical && "!border-crit-line !bg-crit-soft !text-crit")}
          >
            {critical ? <FileWarning className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
          </span>
        </div>
        <button
          onClick={onClose}
          className="nx-bar-item h-7 px-2 text-[11px]"
          aria-label="Close preview"
        >
          Close
        </button>
      </div>
      <p className="mt-3 text-[14.5px] font-semibold leading-snug text-ink">{file.name}</p>
      <p className="mt-1 text-[11.5px] text-ink-4">
        {file.sub} · modified {timeAgo(new Date(file.ts))}
      </p>

      <dl className="mt-4 space-y-2.5">
        {Object.entries(file.data).map(([k, v]) => (
          <div key={k} className="rounded-xl border border-line bg-panel p-2.5">
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-ink-4">{k}</dt>
            <dd className="mt-0.5 whitespace-pre-line text-[12.5px] text-ink-2">{String(v)}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-4 space-y-2">
        {inTrash ? (
          <button
            onClick={onRestore}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink transition hover:brightness-110"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restore document
          </button>
        ) : (
          <>
            {file.kind === "record" && file.patientId && (
              <button
                onClick={() => {
                  window.dispatchEvent(
                    new CustomEvent("nx-open-patient", { detail: file.patientId }),
                  );
                  ctx.open("patients");
                }}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-3 py-2 text-[12.5px] font-semibold text-accent-ink transition hover:brightness-110"
              >
                <UserRound className="h-3.5 w-3.5" /> Open in Patient Records
              </button>
            )}
            {file.kind === "order" && (
              <button
                onClick={() => ctx.open("orders")}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-inset px-3 py-2 text-[12.5px] font-medium text-ink-2 transition hover:border-accent-line hover:text-ink"
              >
                <ClipboardList className="h-3.5 w-3.5" /> Open in Orders & Results
              </button>
            )}
            <button
              onClick={onTrash}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-line bg-inset px-3 py-2 text-[12.5px] font-medium text-ink-3 transition hover:border-crit-line hover:text-crit"
            >
              <Trash2 className="h-3.5 w-3.5" /> Move to Trash
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
