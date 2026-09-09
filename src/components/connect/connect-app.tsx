"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, Inbox, Users, PhoneCall, Send, Paperclip,
  Video, Phone, Mic, MicOff, VideoOff, PhoneOff, X, Plus,
  CheckCheck, Check, Clock, Loader2, Stethoscope, Activity,
  ChevronRight, Pill, MessageCircle, Sparkles, User,
  ShieldCheck, ArrowRight, Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Connection = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
  patientAge: number | null;
  patientGender: string | null;
  source: string;
  sourceRefId: string | null;
  lastConsultDate: string | null;
  lastMessage: { id: string; text: string; fromRole: string; fromName: string | null; createdAt: string; read: boolean } | null;
  unreadCount: number;
  updatedAt: string;
};

type Message = {
  id: string;
  connectionId: string;
  fromRole: string;
  fromName: string | null;
  text: string;
  attachmentType: string | null;
  attachmentUrl: string | null;
  read: boolean;
  readAt: string | null;
  createdAt: string;
};

type Call = {
  id: string;
  connectionId: string;
  type: string;
  status: string;
  initiatedBy: string;
  startedAt: string;
  answeredAt: string | null;
  endedAt: string | null;
  durationSec: number | null;
  prescriptionJson: string | null;
  prescriptionSynced: boolean;
  callSummary: string | null;
  connection: { id: string; doctorName: string; patientName: string; patientId: string; doctorId: string };
};

type QueueEntry = {
  id: string;
  connectionId: string;
  requestedMode: string;
  reason: string | null;
  status: string;
  joinedAt: string;
  connection: {
    id: string; doctorId: string; doctorName: string; doctorSpecialty: string | null;
    patientId: string; patientName: string; patientPhone: string | null;
    patientAge: number | null; patientGender: string | null; source: string;
  };
};

type Tab = "inbox" | "queue" | "calls";

const SOURCE_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  clinic: { bg: "bg-[#D98B6E]/15", text: "text-[#D98B6E]", label: "Clinic" },
  hospital: { bg: "bg-[#9DB89E]/15", text: "text-[#5A7A5B]", label: "Hospital" },
  know_your_health: { bg: "bg-[#E0B080]/15", text: "text-[#B8893D]", label: "KYH" },
};

const avatarInitials = (name: string) =>
  name.replace(/^Dr\.?\s*/i, "").split(" ").map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function ConnectApp() {
  const [tab, setTab] = useState<Tab>("inbox");
  const [doctor, setDoctor] = useState<{ id: string; name: string; specialization: string | null } | null>(null);
  const [doctorLoading, setDoctorLoading] = useState(true);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [queue, setQueue] = useState<{ chat: QueueEntry[]; voice: QueueEntry[]; video: QueueEntry[] }>({ chat: [], voice: [], video: [] });
  const [calls, setCalls] = useState<Call[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeCall, setActiveCall] = useState<{ callId: string; type: "voice" | "video"; connection: Connection } | null>(null);

  // ── Auto-detect doctor from hospital doctors API ─────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setDoctorLoading(true);
      try {
        const res = await fetch("/api/connect/doctors");
        if (!res.ok) throw new Error();
        const d = await res.json();
        const first = (d.doctors || [])[0];
        if (cancelled) return;
        if (first) {
          setDoctor({ id: first.id, name: first.name, specialization: first.specialty || first.department });
        }
      } catch {
        // ignored — UI shows "no doctor" prompt
      } finally {
        if (!cancelled) setDoctorLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Poll connections every 10s ─────────────────────────────────────────
  const loadConnections = useCallback(async () => {
    if (!doctor) return;
    try {
      const res = await fetch(`/api/connect/connections?doctorId=${encodeURIComponent(doctor.id)}`);
      if (!res.ok) return;
      const d = await res.json();
      setConnections(d.connections || []);
    } catch {}
  }, [doctor]);

  // ── Poll queue ──────────────────────────────────────────────────────────
  const loadQueue = useCallback(async () => {
    if (!doctor) return;
    try {
      const res = await fetch(`/api/connect/queue?doctorId=${encodeURIComponent(doctor.id)}`);
      if (!res.ok) return;
      const d = await res.json();
      setQueue(d.queue || { chat: [], voice: [], video: [] });
    } catch {}
  }, [doctor]);

  // ── Poll calls ──────────────────────────────────────────────────────────
  const loadCalls = useCallback(async () => {
    if (!doctor) return;
    try {
      const res = await fetch(`/api/connect/calls?doctorId=${encodeURIComponent(doctor.id)}`);
      if (!res.ok) return;
      const d = await res.json();
      setCalls(d.calls || []);
    } catch {}
  }, [doctor]);

  useEffect(() => {
    if (!doctor) return;
    loadConnections();
    loadQueue();
    loadCalls();
    const id = setInterval(() => {
      loadConnections();
      loadQueue();
      loadCalls();
    }, 10000);
    return () => clearInterval(id);
  }, [doctor, loadConnections, loadQueue, loadCalls]);

  // ── Load messages when a connection is selected ────────────────────────
  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    setMessagesLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/connect/messages?connectionId=${encodeURIComponent(selectedId)}`);
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setMessages(d.messages || []);
      } catch {} finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    // Mark patient messages as read (doctor opened chat)
    fetch("/api/connect/messages/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: selectedId, readByRole: "doctor" }),
    }).then(() => loadConnections()).catch(() => {});
    return () => { cancelled = true; };
  }, [selectedId, loadConnections]);

  // Auto-select first connection if none selected
  useEffect(() => {
    if (!selectedId && connections.length > 0) {
      setSelectedId(connections[0].id);
    }
    if (selectedId && !connections.find((c) => c.id === selectedId) && connections.length > 0) {
      setSelectedId(connections[0].id);
    }
  }, [connections, selectedId]);

  const selected = useMemo(() => connections.find((c) => c.id === selectedId) || null, [connections, selectedId]);

  const filteredConnections = useMemo(() => {
    if (!search.trim()) return connections;
    const q = search.toLowerCase();
    return connections.filter((c) =>
      c.patientName.toLowerCase().includes(q) ||
      (c.patientPhone || "").includes(q) ||
      (c.doctorSpecialty || "").toLowerCase().includes(q)
    );
  }, [connections, search]);

  const sendMessage = async () => {
    if (!selected || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    // Optimistic append
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      connectionId: selected.id,
      fromRole: "doctor",
      fromName: doctor?.name || "Doctor",
      text,
      attachmentType: null,
      attachmentUrl: null,
      read: false,
      readAt: null,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await fetch("/api/connect/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: selected.id, fromRole: "doctor", fromName: doctor?.name, text }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setMessages((m) => m.map((x) => (x.id === optimistic.id ? d.message : x)));
      loadConnections();
    } catch {
      toast.error("Message failed to send");
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    }
  };

  const startCall = async (type: "voice" | "video") => {
    if (!selected) return;
    try {
      const res = await fetch("/api/connect/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: selected.id, type, initiatedBy: "doctor" }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setActiveCall({ callId: d.call.id, type, connection: selected });
      // PATCH to "answered" immediately (demo: patient auto-answers)
      await fetch("/api/connect/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: d.call.id, status: "answered" }),
      });
    } catch {
      toast.error("Could not start call");
    }
  };

  const totalWaiting = queue.chat.length + queue.voice.length + queue.video.length;

  if (doctorLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1F1B17] text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#D98B6E]" />
          <p className="text-sm text-white/60">Loading Nexura Connect…</p>
        </div>
      </div>
    );
  }

  if (!doctor) {
    return (
      <div className="grid min-h-screen place-items-center bg-[#1F1B17] text-white">
        <div className="max-w-md rounded-2xl glass-dark p-6 text-center shadow-depth">
          <Stethoscope className="mx-auto h-10 w-10 text-[#D98B6E]" />
          <h2 className="mt-3 font-serif text-xl font-semibold">No doctor profile found</h2>
          <p className="mt-1 text-sm text-white/60">Run the clinic or hospital seed first, then return here.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#D98B6E] px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" /> Back to homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg-dark relative flex h-screen w-full overflow-hidden text-white">
      {/* ── SIDEBAR ────────────────────────────────────────────────── */}
      <aside className="flex w-[280px] shrink-0 flex-col border-r border-white/10 bg-black/30 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#D98B6E] to-[#E0B080] shadow-depth">
            <Activity className="h-4 w-4 text-white" strokeWidth={2.5} />
          </span>
          <div className="flex-1">
            <p className="font-serif text-sm font-bold tracking-tight">Nexura Connect</p>
            <p className="text-[0.6rem] text-white/50">Doctor dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mx-3 mb-3 grid grid-cols-3 gap-1 rounded-xl bg-white/5 p-1">
          {([
            { id: "inbox", label: "Inbox", icon: Inbox },
            { id: "queue", label: "Queue", icon: Users },
            { id: "calls", label: "Calls", icon: PhoneCall },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "relative flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
                tab === t.id ? "bg-white/10 text-white shadow-sm" : "text-white/55 hover:text-white"
              )}
            >
              <t.icon className="h-3.5 w-3.5" />
              {t.label}
              {t.id === "queue" && totalWaiting > 0 && (
                <span className="ml-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#D98B6E] px-1 text-[0.55rem] font-bold text-white">{totalWaiting}</span>
              )}
              {t.id === "inbox" && connections.some((c) => c.unreadCount > 0) && (
                <span className="ml-0.5 h-2 w-2 rounded-full bg-[#D98B6E] anim-breathe" />
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        {tab === "inbox" && (
          <div className="mx-3 mb-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient…"
                className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-9 pr-3 text-xs text-white placeholder-white/40 outline-none focus:border-[#D98B6E]/60"
              />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {tab === "inbox" && (
            <div className="space-y-1">
              {filteredConnections.length === 0 && (
                <p className="py-8 text-center text-xs text-white/40">No patients yet.</p>
              )}
              {filteredConnections.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-all",
                    selectedId === c.id ? "bg-white/10 shadow-depth" : "hover:bg-white/5"
                  )}
                >
                  <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D98B6E]/40 to-[#C98A7A]/40 text-xs font-bold text-white">
                    {avatarInitials(c.patientName)}
                    {c.unreadCount > 0 && (
                      <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#D98B6E] px-1 text-[0.55rem] font-bold text-white ring-2 ring-[#1F1B17]">{c.unreadCount}</span>
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold">{c.patientName}</p>
                      <span className="shrink-0 text-[0.55rem] text-white/40">{relativeTime(c.lastMessage?.createdAt || c.updatedAt)}</span>
                    </div>
                    <p className="truncate text-[0.65rem] text-white/50">
                      {c.lastMessage ? (
                        <>
                          {c.lastMessage.fromRole === "doctor" && <span className="text-white/40">You: </span>}
                          {c.lastMessage.text}
                        </>
                      ) : (
                        "New conversation"
                      )}
                    </p>
                  </div>
                  {(() => {
                    const s = SOURCE_STYLE[c.source] || SOURCE_STYLE.clinic;
                    return <span className={cn("rounded-full px-1.5 py-0.5 text-[0.5rem] font-semibold", s.bg, s.text)}>{s.label}</span>;
                  })()}
                </button>
              ))}
            </div>
          )}

          {tab === "queue" && <QueueTab queue={queue} onPick={(entry) => {
            // Pick up → also selects conversation
            fetch("/api/connect/queue", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ queueId: entry.id, doctorId: doctor.id }),
            }).then((r) => r.ok ? (toast.success(`Picked up ${entry.connection.patientName}`), loadQueue(), setSelectedId(entry.connection.id), setTab("inbox")) : toast.error("Could not pick up")).catch(() => toast.error("Pickup failed"));
          }} />}

          {tab === "calls" && <CallsTab calls={calls} />}
        </div>

        {/* Doctor footer */}
        <div className="border-t border-white/10 bg-black/40 px-3 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#9DB89E] to-[#5A7A5B] text-xs font-bold text-white">
              {avatarInitials(doctor.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{doctor.name}</p>
              <p className="truncate text-[0.6rem] text-white/50">{doctor.specialization || "Doctor"}</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-[#9DB89E]/15 px-2 py-0.5 text-[0.55rem] font-medium text-[#9DB89E]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9DB89E] anim-breathe" /> Online
            </span>
          </div>
          <Link href="/" className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-white/40 hover:text-white/70">
            <ArrowLeft className="h-3 w-3" /> Homepage
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONVERSATION AREA ─────────────────────────────────── */}
      <main className="flex flex-1 flex-col bg-gradient-to-br from-[#FBF7F2] to-[#F3EEE6]">
        {selected ? (
          <>
            {/* Header */}
            <header className="flex items-center justify-between border-b border-[#E5DFD4] bg-white/80 px-5 py-3 backdrop-blur-md">
              <div className="flex items-center gap-3">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] text-sm font-bold text-white shadow-depth">
                  {avatarInitials(selected.patientName)}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-serif text-base font-semibold text-[#1F1B17]">{selected.patientName}</p>
                    {(() => {
                      const s = SOURCE_STYLE[selected.source] || SOURCE_STYLE.clinic;
                      return <span className={cn("rounded-full px-2 py-0.5 text-[0.55rem] font-semibold", s.bg, s.text)}>{s.label}</span>;
                    })()}
                  </div>
                  <p className="text-[0.7rem] text-[#9A8F84]">
                    {selected.patientAge ? `${selected.patientAge}y` : ""}{selected.patientGender ? ` · ${selected.patientGender}` : ""}{selected.patientPhone ? ` · ${selected.patientPhone}` : ""}
                    {selected.lastConsultDate ? ` · Last consult ${relativeTime(selected.lastConsultDate)}` : ""}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => startCall("voice")}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#9DB89E] shadow-sm ring-1 ring-[#E5DFD4] transition-all hover:scale-105 hover:bg-[#9DB89E] hover:text-white"
                  title="Voice call"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => startCall("video")}
                  className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#D98B6E] shadow-sm ring-1 ring-[#E5DFD4] transition-all hover:scale-105 hover:bg-[#D98B6E] hover:text-white"
                  title="Video call"
                >
                  <Video className="h-4 w-4" />
                </button>
              </div>
            </header>

            {/* Messages */}
            <div className="flex-1 space-y-2 overflow-y-auto px-5 py-4">
              {messagesLoading ? (
                <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" /></div>
              ) : messages.length === 0 ? (
                <div className="grid h-40 place-items-center text-center">
                  <div>
                    <MessageCircle className="mx-auto h-8 w-8 text-[#E5DFD4]" />
                    <p className="mt-2 text-sm text-[#9A8F84]">Start the conversation</p>
                    <p className="text-[0.65rem] text-[#B5A99E]">Say hello to {selected.patientName}</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {messages.map((m, i) => {
                    const isDoctor = m.fromRole === "doctor";
                    const prev = messages[i - 1];
                    const showAvatar = !prev || prev.fromRole !== m.fromRole;
                    return (
                      <motion.div
                        key={m.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn("flex items-end gap-2", isDoctor && "justify-end")}
                      >
                        {!isDoctor && (
                          <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D98B6E]/60 to-[#C98A7A]/60 text-[0.55rem] font-bold text-white", !showAvatar && "opacity-0")}>
                            {avatarInitials(selected.patientName)}
                          </span>
                        )}
                        <div className={cn("max-w-[68%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", isDoctor ? "bg-[#D98B6E] text-white rounded-br-sm" : "glass-soft text-[#1F1B17] rounded-bl-sm")}>
                          <p className="whitespace-pre-wrap leading-snug">{m.text}</p>
                          <div className={cn("mt-1 flex items-center justify-end gap-1 text-[0.55rem]", isDoctor ? "text-white/70" : "text-[#9A8F84]")}>
                            <span>{relativeTime(m.createdAt)}</span>
                            {isDoctor && (m.read ? <CheckCheck className="h-3 w-3 text-white/80" /> : <Check className="h-3 w-3 text-white/60" />)}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-[#E5DFD4] bg-white/80 px-5 py-3 backdrop-blur-md">
              <div className="flex items-end gap-2">
                <button className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-[#9A8F84] hover:bg-[#F3EEE6]" title="Attach (coming soon)">
                  <Paperclip className="h-4 w-4" />
                </button>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={`Message ${selected.patientName}…`}
                  rows={1}
                  className="glass-input max-h-32 flex-1 resize-none rounded-2xl px-3.5 py-2.5 text-sm outline-none"
                />
                <button
                  onClick={sendMessage}
                  disabled={!draft.trim()}
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#D98B6E] text-white shadow-depth transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[0.6rem] text-[#B5A99E]">Press Enter to send · Shift+Enter for newline</p>
            </div>
          </>
        ) : (
          <div className="grid flex-1 place-items-center">
            <div className="text-center">
              <Inbox className="mx-auto h-10 w-10 text-[#E5DFD4]" />
              <p className="mt-3 font-serif text-lg font-semibold text-[#1F1B17]">Select a conversation</p>
              <p className="text-sm text-[#9A8F84]">Choose a patient from the sidebar to start chatting.</p>
            </div>
          </div>
        )}
      </main>

      {/* ── VIDEO CALL OVERLAY ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeCall && (
          <CallOverlay
            call={activeCall}
            doctor={doctor}
            onEnd={(summary) => {
              endCall(activeCall.callId, summary);
              setActiveCall(null);
            }}
            onSynced={() => {
              loadCalls();
              loadConnections();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );

  async function endCall(callId: string, summary?: { durationSec: number; callSummary?: string; prescriptionJson?: string }) {
    try {
      await fetch("/api/connect/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId,
          status: "ended",
          durationSec: summary?.durationSec,
          callSummary: summary?.callSummary,
          prescriptionJson: summary?.prescriptionJson,
        }),
      });
      toast.success("Call ended");
    } catch {
      toast.error("Could not end call");
    }
  }
}

/* ── Queue tab ───────────────────────────────────────────────────── */

function QueueTab({ queue, onPick }: { queue: { chat: QueueEntry[]; voice: QueueEntry[]; video: QueueEntry[] }; onPick: (e: QueueEntry) => void }) {
  const groups = [
    { id: "video", label: "Video", items: queue.video, color: "#D98B6E" },
    { id: "voice", label: "Voice", items: queue.voice, color: "#E0B080" },
    { id: "chat", label: "Chat", items: queue.chat, color: "#9DB89E" },
  ] as const;
  const total = queue.chat.length + queue.voice.length + queue.video.length;
  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white/5 p-2.5 text-center">
        <p className="text-[0.6rem] uppercase tracking-wider text-white/40">Total waiting</p>
        <p className="font-serif text-2xl font-bold text-white">{total}</p>
      </div>
      {total === 0 && (
        <p className="py-6 text-center text-xs text-white/40">No one waiting — queue is clear.</p>
      )}
      {groups.map((g) => g.items.length > 0 && (
        <div key={g.id}>
          <p className="mb-1.5 flex items-center gap-1.5 px-1 text-[0.6rem] font-semibold uppercase tracking-wider text-white/40">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: g.color }} />
            {g.label} · {g.items.length}
          </p>
          <div className="space-y-1.5">
            {g.items.map((e) => (
              <button
                key={e.id}
                onClick={() => onPick(e)}
                className="group w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-left transition-all hover:bg-white/10"
              >
                <div className="flex items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#D98B6E]/40 to-[#C98A7A]/40 text-[0.6rem] font-bold text-white">
                    {avatarInitials(e.connection.patientName)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{e.connection.patientName}</p>
                    <p className="truncate text-[0.6rem] text-white/50">{e.reason || "No reason given"}</p>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 text-white/40 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Calls tab ───────────────────────────────────────────────────── */

function CallsTab({ calls }: { calls: Call[] }) {
  if (calls.length === 0) {
    return <p className="py-8 text-center text-xs text-white/40">No calls yet.</p>;
  }
  return (
    <div className="space-y-1.5">
      {calls.map((c) => (
        <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
          <div className="flex items-center gap-2">
            <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-full", c.type === "video" ? "bg-[#D98B6E]/20 text-[#D98B6E]" : "bg-[#9DB89E]/20 text-[#9DB89E]")}>
              {c.type === "video" ? <Video className="h-3.5 w-3.5" /> : <Phone className="h-3.5 w-3.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold">{c.connection.patientName}</p>
              <p className="text-[0.6rem] text-white/50">
                {c.initiatedBy === "doctor" ? "You initiated" : "Patient initiated"} · {formatDuration(c.durationSec)} · {relativeTime(c.startedAt)}
              </p>
            </div>
            {c.prescriptionJson && (
              <span className={cn("flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.5rem] font-semibold", c.prescriptionSynced ? "bg-[#9DB89E]/15 text-[#9DB89E]" : "bg-[#E0B080]/15 text-[#E0B080]")}>
                <Pill className="h-2.5 w-2.5" /> {c.prescriptionSynced ? "Synced" : "Pending"}
              </span>
            )}
          </div>
          {c.callSummary && <p className="mt-1.5 line-clamp-2 rounded-lg bg-white/5 px-2 py-1 text-[0.65rem] text-white/60">{c.callSummary}</p>}
        </div>
      ))}
    </div>
  );
}

/* ── Video call overlay (with Rx panel) ──────────────────────────── */

type RxItem = { id: string; name: string; salt: string; dosage: string; frequency: string; duration: string; quantity: number };

function CallOverlay({
  call,
  doctor,
  onEnd,
  onSynced,
}: {
  call: { callId: string; type: "voice" | "video"; connection: Connection };
  doctor: { id: string; name: string; specialization: string | null };
  onEnd: (summary?: { durationSec: number; callSummary?: string; prescriptionJson?: string }) => void;
  onSynced: () => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [rx, setRx] = useState<RxItem[]>([]);
  const [drugQuery, setDrugQuery] = useState("");
  const [drugResults, setDrugResults] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [showRx, setShowRx] = useState(true);
  const startTimeRef = useRef(Date.now());

  // timer
  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // drug autocomplete
  useEffect(() => {
    const q = drugQuery.trim().toLowerCase();
    if (!q || q.length < 1) { setDrugResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/clinic/drugs?q=${encodeURIComponent(q)}`);
        const d = await res.json();
        setDrugResults(d.drugs || []);
      } catch { setDrugResults([]); }
    }, 200);
    return () => clearTimeout(t);
  }, [drugQuery]);

  const addDrug = (drug: any) => {
    setRx((r) => [...r, {
      id: `rx-${Date.now()}`,
      name: drug.brandName,
      salt: drug.saltName,
      dosage: drug.strength || "",
      frequency: "1-0-1",
      duration: "5 days",
      quantity: 1,
    }]);
    setDrugQuery("");
    setDrugResults([]);
  };

  const updateRx = (id: string, patch: Partial<RxItem>) => setRx((r) => r.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const removeRx = (id: string) => setRx((r) => r.filter((x) => x.id !== id));

  const syncPrescription = async () => {
    if (rx.length === 0) {
      toast.error("Add at least one medicine");
      return;
    }
    setSyncing(true);
    try {
      const res = await fetch("/api/connect/prescriptions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callId: call.callId,
          items: rx.map((x) => ({ name: x.name, salt: x.salt, dosage: x.dosage, frequency: x.frequency, duration: x.duration, quantity: x.quantity })),
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (d.saleId) {
        toast.success(`Prescription synced to Pharmacia (Invoice ${d.saleInvoiceNo || ""})`);
      } else {
        toast.info("Prescription saved — no matching pharmacy products");
      }
      onSynced();
    } catch {
      toast.error("Sync failed");
    } finally {
      setSyncing(false);
    }
  };

  const handleEnd = () => {
    const prescriptionJson = rx.length > 0 ? JSON.stringify(rx.map(({ id, ...rest }) => rest)) : undefined;
    onEnd({
      durationSec: seconds,
      callSummary: `Call with ${call.connection.patientName}. ${rx.length > 0 ? `Rx: ${rx.map((x) => x.name).join(", ")}.` : ""}`,
      prescriptionJson,
    });
  };

  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0E0C0A] text-white"
    >
      {/* main video area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Remote (patient) tile */}
        <div className="absolute inset-0 grid place-items-center mesh-bg-dark">
          <div className="text-center">
            <div className="relative mx-auto h-32 w-32">
              <span className="absolute inset-0 rounded-full bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] anim-breathe" />
              <span className="absolute inset-2 grid place-items-center rounded-full bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] font-serif text-4xl font-bold text-white shadow-depth">
                {avatarInitials(call.connection.patientName)}
              </span>
              <span className="pulse-ring absolute inset-0 rounded-full" />
            </div>
            <p className="mt-4 font-serif text-xl font-semibold">{call.connection.patientName}</p>
            <p className="text-xs text-white/60">{call.connection.patientAge ? `${call.connection.patientAge}y` : ""} {call.connection.patientGender ? `· ${call.connection.patientGender}` : ""}</p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
                <span className="h-1.5 w-1.5 rounded-full bg-[#9DB89E] anim-breathe" /> Live
              </span>
              <span className="font-mono text-xs tabular-nums text-white/80">{timer}</span>
            </div>
          </div>
        </div>

        {/* Self PiP (doctor) */}
        <div className="absolute right-4 top-4 h-32 w-24 overflow-hidden rounded-xl border border-white/20 bg-[#1F1B17] shadow-depth sm:h-44 sm:w-32">
          <div className="grid h-full place-items-center">
            {cameraOff ? (
              <div className="text-center">
                <VideoOff className="mx-auto h-5 w-5 text-white/40" />
                <p className="mt-1 text-[0.5rem] text-white/40">Camera off</p>
              </div>
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-[#9DB89E] to-[#5A7A5B] text-sm font-bold">
                {avatarInitials(doctor.name)}
              </span>
            )}
          </div>
          <p className="absolute bottom-1 left-1 right-1 truncate rounded bg-black/40 px-1 py-0.5 text-center text-[0.5rem] font-medium backdrop-blur-sm">{doctor.name}</p>
        </div>

        {/* Top bar */}
        <div className="absolute left-4 top-4 flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-xs font-medium backdrop-blur-sm">
            {call.type === "video" ? <Video className="h-3.5 w-3.5 text-[#D98B6E]" /> : <Phone className="h-3.5 w-3.5 text-[#9DB89E]" />}
            {call.type === "video" ? "Video call" : "Voice call"}
          </span>
          <span className="rounded-full bg-black/40 px-2 py-1 text-[0.6rem] text-white/60 backdrop-blur-sm">with {call.connection.patientName}</span>
        </div>

        {/* Rx panel toggle */}
        <button
          onClick={() => setShowRx(!showRx)}
          className="absolute right-4 bottom-4 flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-medium backdrop-blur-sm hover:bg-white/20"
        >
          <Pill className="h-3.5 w-3.5 text-[#D98B6E]" /> {showRx ? "Hide" : "Show"} Rx
          {rx.length > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-[#D98B6E] px-1 text-[0.5rem] font-bold">{rx.length}</span>}
        </button>

        {/* Rx panel */}
        <AnimatePresence>
          {showRx && (
            <motion.div
              initial={{ x: 360, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 360, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 240 }}
              className="absolute right-4 top-1/2 w-[340px] max-w-[calc(100vw-2rem)] -translate-y-1/2 rounded-2xl glass-dark p-3 shadow-depth-lg"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Pill className="h-4 w-4 text-[#D98B6E]" /> Live Prescription
                </p>
                <button onClick={() => setShowRx(false)} className="grid h-6 w-6 place-items-center rounded-full text-white/50 hover:bg-white/10"><X className="h-3.5 w-3.5" /></button>
              </div>

              {/* drug search */}
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
                <input
                  value={drugQuery}
                  onChange={(e) => setDrugQuery(e.target.value)}
                  placeholder="Add medicine…"
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/5 pl-8 pr-2 text-xs text-white placeholder-white/40 outline-none focus:border-[#D98B6E]/60"
                />
                {drugResults.length > 0 && (
                  <div className="absolute z-10 mt-1 max-h-44 w-full overflow-auto rounded-lg bg-[#1F1B17] shadow-depth-lg ring-1 ring-white/10">
                    {drugResults.map((d) => (
                      <button key={d.id} onMouseDown={() => addDrug(d)} className="flex w-full items-center gap-2 border-b border-white/5 px-2.5 py-2 text-left last:border-0 hover:bg-white/5">
                        <Pill className="h-3 w-3 text-[#9DB89E]" />
                        <div className="flex-1">
                          <p className="text-xs font-medium">{d.brandName} {d.strength}</p>
                          <p className="text-[0.55rem] text-white/50">{d.saltName} · {d.company}</p>
                        </div>
                        <Plus className="h-3 w-3 text-[#D98B6E]" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Rx items */}
              <div className="mt-2 max-h-64 space-y-1.5 overflow-y-auto">
                {rx.length === 0 && (
                  <p className="rounded-lg border border-dashed border-white/10 px-3 py-4 text-center text-[0.65rem] text-white/40">
                    Search above to add medicines during the call.
                  </p>
                )}
                {rx.map((x) => (
                  <div key={x.id} className="rounded-lg border border-white/10 bg-white/5 p-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-xs font-semibold">{x.name} <span className="text-white/50">{x.dosage}</span></p>
                      <button onClick={() => removeRx(x.id)} className="shrink-0 text-white/50 hover:text-[#D98B6E]"><X className="h-3 w-3" /></button>
                    </div>
                    <p className="text-[0.55rem] text-white/50">{x.salt}</p>
                    <div className="mt-1.5 grid grid-cols-3 gap-1">
                      <input value={x.frequency} onChange={(e) => updateRx(x.id, { frequency: e.target.value })} placeholder="1-0-1" className="h-6 rounded bg-white/5 px-1.5 text-[0.6rem] outline-none focus:bg-white/10" />
                      <input value={x.duration} onChange={(e) => updateRx(x.id, { duration: e.target.value })} placeholder="5 days" className="h-6 rounded bg-white/5 px-1.5 text-[0.6rem] outline-none focus:bg-white/10" />
                      <input type="number" min={1} value={x.quantity} onChange={(e) => updateRx(x.id, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="h-6 rounded bg-white/5 px-1.5 text-[0.6rem] outline-none focus:bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>

              {/* Sync button */}
              <button
                onClick={syncPrescription}
                disabled={syncing || rx.length === 0}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#D98B6E] to-[#E0B080] px-3 py-2 text-xs font-semibold text-white shadow-depth transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {syncing ? "Syncing…" : "Sync to Pharmacia"}
              </button>
              <p className="mt-1.5 flex items-center justify-center gap-1 text-[0.55rem] text-white/40">
                <ShieldCheck className="h-2.5 w-2.5" /> Creates a Sale invoice in pharmacy demo branch
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Call controls */}
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-2 backdrop-blur-md">
          <button
            onClick={() => setMuted(!muted)}
            className={cn("grid h-10 w-10 place-items-center rounded-full transition-colors", muted ? "bg-[#D98B6E] text-white" : "bg-white/10 text-white hover:bg-white/20")}
            title={muted ? "Unmute" : "Mute"}
          >
            {muted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
          {call.type === "video" && (
            <button
              onClick={() => setCameraOff(!cameraOff)}
              className={cn("grid h-10 w-10 place-items-center rounded-full transition-colors", cameraOff ? "bg-[#D98B6E] text-white" : "bg-white/10 text-white hover:bg-white/20")}
              title={cameraOff ? "Camera on" : "Camera off"}
            >
              {cameraOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
            </button>
          )}
          <button
            onClick={handleEnd}
            className="flex items-center gap-1.5 rounded-full bg-[#C98A7A] px-4 py-2.5 text-sm font-semibold text-white shadow-depth transition-all hover:scale-105 hover:bg-[#A55A4A]"
          >
            <PhoneOff className="h-4 w-4" /> End Call
          </button>
        </div>
      </div>
    </motion.div>
  );
}
