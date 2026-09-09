"use client";

import { useEffect, useRef, useState } from "react";
import { Hash, Send } from "lucide-react";
import { nx, useNx, fmtClock } from "./client";
import { Empty, ErrorState, Loading, Panel } from "./bits";

/* ============================================================
   CARE COMMUNICATION — secure channels with context
   ============================================================ */

interface Msg { id: string; sender: string; role: string; body: string; at: string; patientId: string | null }
interface MsgData {
  messages: Msg[];
  channels: Array<{ key: string; label: string; kind: string; patientId?: string }>;
}

export function MessagesCenter() {
  const [channel, setChannel] = useState("shift-handover");
  const { data, error, loading, refresh } = useNx<MsgData>(`/api/nx/messages?channel=${encodeURIComponent(channel)}`, { pollMs: 10000 });
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages.length]);

  async function send() {
    if (!draft.trim()) return;
    setSending(true);
    try {
      await nx("/api/nx/messages", { method: "POST", body: JSON.stringify({ channel, body: draft }) });
      setDraft("");
      refresh();
    } catch {
      // silent — refresh will show failure state
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <Panel title="Channels" subtitle="Context-scoped & audited">
        <div className="space-y-1">
          {data?.channels.map((c) => (
            <button
              key={c.key}
              onClick={() => setChannel(c.key)}
              className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition ${channel === c.key ? "bg-accent-soft font-medium text-accent ring-1 ring-accent-line" : "text-ink-3 hover:bg-inset"}`}
            >
              <Hash className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{c.label}</span>
              {c.kind === "care-team" && <span className="ml-auto text-[9px] uppercase text-ink-4">care</span>}
            </button>
          ))}
        </div>
      </Panel>

      <Panel title={data?.channels.find((c) => c.key === channel)?.label || channel} subtitle="Messages carry clinical context without exposing more than needed">
        <div className="flex h-[440px] flex-col">
          <div className="nx-scroll flex-1 space-y-2.5 overflow-y-auto pr-1">
            {loading ? (
              <Loading rows={4} />
            ) : error ? (
              <ErrorState message={error.message} onRetry={refresh} />
            ) : !data?.messages.length ? (
              <Empty title="No messages yet" hint="Start the conversation — every message is audit-logged." />
            ) : (
              data.messages.map((m) => (
                <div key={m.id} className="max-w-[85%]">
                  <p className="text-[10px] text-ink-3">{m.sender} · {m.role} · {fmtClock(m.at)}</p>
                  <div className={`mt-0.5 rounded-xl px-3 py-2 text-xs ${m.role === "system" ? "border border-vio-line bg-vio-soft text-vio" : "border border-line bg-panel text-ink"}`}>
                    {m.body}
                  </div>
                </div>
              ))
            )}
            <div ref={endRef} />
          </div>
          <div className="mt-3 flex items-center gap-2 border-t border-line pt-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
              placeholder="Message the care team… (Shift+Enter for newline)"
              className="flex-1 rounded-lg border border-line bg-panel px-3 py-2 text-sm text-ink outline-none placeholder:text-ink-4 focus:border-accent-line"
            />
            <button onClick={send} disabled={sending || !draft.trim()} className="flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-accent-ink hover:bg-accent disabled:opacity-50">
              <Send className="h-3.5 w-3.5" /> Send
            </button>
          </div>
        </div>
      </Panel>
    </div>
  );
}
