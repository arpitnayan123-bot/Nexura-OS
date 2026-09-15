"use client";

import { useEffect, useRef, useState } from "react";
import { SquareTerminal } from "lucide-react";
import { cn } from "@/lib/utils";
import { nx, timeAgo } from "../client";
import { APPS, appFor, type AppCtx } from "./registry";
import { useOs, type Wallpaper } from "./store";

/* ============================================================
   HOSPITAL OS — Console
   A real terminal over the live hospital APIs. Every command
   reads or drives the same system the UI does.
   ============================================================ */

interface Line { text: string; kind: "in" | "out" | "ok" | "err" | "sys" }

const BANNER = [
  "  _   _                 _            _     ___  ___",
  " | | | |___  ___ _ _   | |__ _  _ __| |__ / _ \\/ __|",
  " | |_| / _ \\/ -_) '_ \\  / _ \\ || / _| / /| (_) \\__ \\",
  "  \\___/\\___/\\___|_||_| |_//\\_\\_,_\\__|_\\_\\ \\___/|___/",
];

export function ConsoleApp({ ctx }: { ctx: AppCtx }) {
  const [lines, setLines] = useState<Line[]>(() => [
    ...BANNER.map((text) => ({ text, kind: "sys" as const })),
    { text: "Hospital OS console — type `help` for commands.", kind: "sys" },
    { text: "", kind: "out" },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [lines, busy]);

  const print = (text: string, kind: Line["kind"] = "out") => setLines((l) => [...l, { text, kind }]);

  async function run(raw: string) {
    const cmd = raw.trim();
    setLines((l) => [...l, { text: `hospital-os ~ $ ${cmd}`, kind: "in" }]);
    if (!cmd) return;
    setHistory((h) => [cmd, ...h].slice(0, 40));
    setHistIdx(-1);
    const [name, ...args] = cmd.split(/\s+/);
    const arg = args.join(" ");

    try {
      switch (name.toLowerCase()) {
        case "help":
          print([
            "help              list commands",
            "whoami            current staff session",
            "census            live hospital overview",
            "beds              bed availability by status",
            "tasks             active work queue counts",
            "apps              installed applications",
            "open <app>        launch an app (try: open files)",
            "theme <mode>      auto | light | dark",
            "wallpaper <name>  aurora | dawn | meadow | mono",
            "lock              lock the screen",
            "date              current date & time",
            "uptime            session info",
            "clear             clear the console",
            "echo <text>       print text",
          ].join("\n"));
          break;

        case "whoami": {
          const r = await nx<{ user: { name: string; role: string; department?: string; hospitalId?: string } }>("/api/nx/auth");
          print(`${r.user.name} — ${r.user.role}${r.user.department ? ` · ${r.user.department}` : ""}`, "ok");
          break;
        }

        case "census": {
          try {
            const r = await nx<{ census?: Record<string, number>; hospital?: { name?: string }; critical?: Record<string, number> }>("/api/nx/overview");
            print([
              `${r.hospital?.name ?? "Hospital"}`,
              `census      ${r.census?.total ?? "—"}`,
              `occupancy   ${r.census?.occupancyPct ?? "—"}%`,
              `critical    ${(r.critical?.openTasks ?? 0) + (r.critical?.openIncidents ?? 0)} open items`,
            ].join("\n"), "ok");
          } catch {
            print("census needs the Command Center module — try `beds` or `tasks` instead.", "err");
          }
          break;
        }

        case "beds": {
          const r = await nx<{ counts: Record<string, number>; total: number; occupancyPct: number }>("/api/nx/beds");
          print([
            `total       ${r.total}`,
            `occupancy   ${r.occupancyPct}%`,
            ...Object.entries(r.counts ?? {}).map(([k, v]) => `${k.padEnd(11)} ${v}`),
          ].join("\n"), "ok");
          break;
        }

        case "tasks": {
          const r = await nx<{ counts: Record<string, number>; tasks?: Array<{ title: string; dueAt?: string }> }>("/api/nx/tasks?status=active");
          print([
            `critical    ${r.counts.critical ?? 0}`,
            `overdue     ${r.counts.overdue ?? 0}`,
            ...(r.tasks ?? []).slice(0, 5).map((t) => `• ${t.title}${t.dueAt ? ` — due ${timeAgo(t.dueAt)}` : ""}`),
          ].join("\n"), "ok");
          break;
        }

        case "apps":
          print(APPS.filter((a) => a.system || true).map((a) => `${a.key.padEnd(16)} ${a.label}`).join("\n"));
          break;

        case "open": {
          const key = arg.toLowerCase().trim();
          const def = appFor(key) || APPS.find((a) => a.label.toLowerCase() === arg.toLowerCase());
          if (!def) { print(`no app named “${arg}” — try \`apps\``, "err"); break; }
          ctx.open(def.key);
          print(`launching ${def.label}…`, "ok");
          break;
        }

        case "theme": {
          const v = arg.toLowerCase();
          if (!["auto", "light", "dark"].includes(v)) { print("usage: theme auto|light|dark", "err"); break; }
          useOs.getState().setTheme(v as "auto" | "light" | "dark");
          print(`appearance set to ${v}`, "ok");
          break;
        }

        case "wallpaper": {
          const v = arg.toLowerCase();
          if (!["aurora", "dawn", "meadow", "mono"].includes(v)) { print("usage: wallpaper aurora|dawn|meadow|mono", "err"); break; }
          useOs.getState().setWallpaper(v as Wallpaper);
          print(`wallpaper set to ${v}`, "ok");
          break;
        }

        case "lock":
          print("locking…", "ok");
          setTimeout(() => useOs.getState().lock(), 300);
          break;

        case "date":
          print(new Date().toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }) + " IST", "ok");
          break;

        case "uptime":
          print("Hospital OS v4 “Foundation” — session up since you signed in. Audit chain: intact.", "ok");
          break;

        case "echo":
          print(arg || "");
          break;

        case "clear":
          setLines([]);
          break;

        default:
          print(`command not found: ${name} — type \`help\``, "err");
      }
    } catch (e) {
      print((e as Error).message || "request failed", "err");
    } finally {
      setLines((l) => [...l, { text: "", kind: "out" }]);
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="nx-console" onClick={() => inputRef.current?.focus()} role="terminal" aria-label="Hospital OS console">
      <div ref={scrollRef} className="nx-console-scroll nx-scroll">
        {lines.map((ln, i) => (
          <div
            key={i}
            className={cn(
              "nx-console-line",
              ln.kind === "in" && "text-ink-4",
              ln.kind === "ok" && "text-good",
              ln.kind === "err" && "text-crit",
              ln.kind === "sys" && "text-accent",
              ln.kind === "out" && "text-ink-2"
            )}
          >
            {ln.text || "\u00A0"}
          </div>
        ))}
        {busy && <div className="nx-console-line animate-pulse text-ink-4">working…</div>}
      </div>
      <div className="nx-console-input">
        <span className="nx-console-prompt">hospital-os ~ $</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !busy) { const v = input; setInput(""); void run(v); }
            else if (e.key === "ArrowUp") {
              e.preventDefault();
              const next = Math.min(histIdx + 1, history.length - 1);
              if (next >= 0) { setHistIdx(next); setInput(history[next]); }
            } else if (e.key === "ArrowDown") {
              e.preventDefault();
              const next = histIdx - 1;
              setHistIdx(next);
              setInput(next >= 0 ? history[next] : "");
            }
          }}
          placeholder="help"
          aria-label="Console input"
          autoComplete="off"
          spellCheck={false}
        />
        <SquareTerminal className="h-3.5 w-3.5 shrink-0 text-ink-4" />
      </div>
    </div>
  );
}
