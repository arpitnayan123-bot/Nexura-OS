"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MessageCircle, Phone, Video, Send, X, Loader2,
  Stethoscope, ShieldCheck, Clock, PhoneOff, Sparkles, Heart,
  Activity, CheckCheck, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type Connection = {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialty: string | null;
  doctorPhone: string | null;
  patientId: string;
  patientName: string;
  patientPhone: string | null;
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

const avatarInitials = (name: string) =>
  name.replace(/^Dr\.?\s*/i, "").split(" ").map((x) => x[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

const relativeTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const SPECIALTY_COLOR: Record<string, string> = {
  Cardiologist: "#D98B6E",
  Pediatrician: "#9DB89E",
  "General Physician": "#E0B080",
  Surgeon: "#C98A7A",
  default: "#D98B6E",
};

export function PatientView() {
  const [patientName, setPatientName] = useState<string | null>(null);
  const [patientId, setPatientId] = useState<string | null>(null);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeConn, setActiveConn] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [draft, setDraft] = useState("");
  const [activeCall, setActiveCall] = useState<{ callId: string; type: "voice" | "video"; doctor: Connection } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Discover demo patient from hospital EHR API
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/hospital/ehr?take=1");
        if (!res.ok) throw new Error();
        const d = await res.json();
        const firstPatient = (d.patients || [])[0];
        if (cancelled) return;
        if (firstPatient) {
          setPatientId(firstPatient.id);
          setPatientName(firstPatient.fullName);
        }
      } catch {
        // ignored
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Load connections for this patient
  const loadConnections = useCallback(async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`/api/connect/connections?patientId=${encodeURIComponent(patientId)}`);
      if (!res.ok) return;
      const d = await res.json();
      setConnections(d.connections || []);
    } catch {}
  }, [patientId]);

  useEffect(() => {
    if (!patientId) return;
    loadConnections();
    const id = setInterval(loadConnections, 10000);
    return () => clearInterval(id);
  }, [patientId, loadConnections]);

  // Load messages for active conversation
  useEffect(() => {
    if (!activeConn) return;
    let cancelled = false;
    setMessagesLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/connect/messages?connectionId=${encodeURIComponent(activeConn.id)}`);
        if (!res.ok) return;
        const d = await res.json();
        if (!cancelled) setMessages(d.messages || []);
      } catch {} finally {
        if (!cancelled) setMessagesLoading(false);
      }
    })();
    // mark doctor messages as read (patient opened)
    fetch("/api/connect/messages/read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: activeConn.id, readByRole: "patient" }),
    }).then(() => loadConnections()).catch(() => {});
    return () => { cancelled = true; };
  }, [activeConn, loadConnections]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!activeConn || !draft.trim()) return;
    const text = draft.trim();
    setDraft("");
    const optimistic: Message = {
      id: `tmp-${Date.now()}`,
      connectionId: activeConn.id,
      fromRole: "patient",
      fromName: patientName,
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
        body: JSON.stringify({ connectionId: activeConn.id, fromRole: "patient", fromName: patientName, text }),
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

  const startCall = async (conn: Connection, type: "voice" | "video") => {
    try {
      const res = await fetch("/api/connect/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: conn.id, type, initiatedBy: "patient" }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setActiveCall({ callId: d.call.id, type, doctor: conn });
      // auto-answer (demo)
      await fetch("/api/connect/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId: d.call.id, status: "answered" }),
      });
    } catch {
      toast.error("Could not start call");
    }
  };

  const endCall = async (callId: string, durationSec: number) => {
    try {
      await fetch("/api/connect/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callId, status: "ended", durationSec }),
      });
      toast.success("Call ended");
    } catch {}
  };

  if (loading) {
    return (
      <div className="mesh-bg grid min-h-screen place-items-center">
        <div className="flex flex-col items-center gap-3 text-[#5C544D]">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#E5DFD4] border-t-[#D98B6E]" />
          <p className="text-sm">Loading your doctors…</p>
        </div>
      </div>
    );
  }

  if (!patientId) {
    return (
      <div className="mesh-bg grid min-h-screen place-items-center px-4">
        <div className="max-w-md rounded-3xl glass-soft p-6 text-center shadow-depth">
          <Stethoscope className="mx-auto h-10 w-10 text-[#D98B6E]" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-[#1F1B17]">No patient profile found</h2>
          <p className="mt-1 text-sm text-[#9A8F84]">Please run the clinic seed first to set up a demo patient.</p>
          <Link href="/" className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#2A2622] px-4 py-2 text-sm font-semibold text-white">
            <ArrowLeft className="h-4 w-4" /> Homepage
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mesh-bg min-h-screen text-[#1F1B17]">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-[#E5DFD4] bg-white/70 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-1.5 text-xs text-[#9A8F84] hover:text-[#5C544D]">
            <ArrowLeft className="h-3.5 w-3.5" /> Home
          </Link>
          <div className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-[#D98B6E] to-[#E0B080] shadow-sm">
              <Activity className="h-3.5 w-3.5 text-white" strokeWidth={2.4} />
            </span>
            <span className="font-serif text-sm font-bold tracking-tight">Nexura Connect</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-1 text-[0.6rem] font-medium text-[#5A7A5B] ring-1 ring-[#9DB89E]/30">
            <span className="h-1.5 w-1.5 rounded-full bg-[#9DB89E] anim-breathe" /> Patient
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        {/* Hero header */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <p className="text-xs font-medium uppercase tracking-wider text-[#9A8F84]">Welcome back</p>
          <h1 className="mt-1 font-serif text-3xl font-bold tracking-tight text-[#1F1B17] sm:text-4xl">
            Your Doctors, <span className="text-gradient-warm">One Tap Away</span>
          </h1>
          <p className="mt-2 text-sm text-[#9A8F84] sm:max-w-xl sm:mx-auto">
            Hi {patientName?.split(" ")[0]} — your care team is here for follow-up. Chat, voice, or video — your doctor is just a tap away.
          </p>
        </motion.div>

        {connections.length === 0 ? (
          <div className="rounded-3xl glass-soft p-10 text-center shadow-depth">
            <Heart className="mx-auto h-10 w-10 text-[#D98B6E]" />
            <p className="mt-3 font-serif text-lg font-semibold">No active connections yet</p>
            <p className="mt-1 text-sm text-[#9A8F84]">Once your doctor completes a consultation or admission, you will see them here.</p>
          </div>
        ) : (
          <>
            {/* Grid of doctor cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {connections.map((c, i) => {
                const color = SPECIALTY_COLOR[c.doctorSpecialty || "default"] || SPECIALTY_COLOR.default;
                return (
                  <motion.div
                    key={c.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="group overflow-hidden rounded-3xl glass-soft shadow-depth transition-all hover:-translate-y-1 hover:shadow-depth-lg"
                  >
                    {/* header */}
                    <div className="relative overflow-hidden p-5 pb-4" style={{ background: `linear-gradient(135deg, ${color}18, ${color}08)` }}>
                      <div className="flex items-start justify-between">
                        <span className="grid h-14 w-14 place-items-center rounded-2xl font-serif text-xl font-bold text-white shadow-depth" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                          {avatarInitials(c.doctorName)}
                        </span>
                        {c.lastMessage && !c.lastMessage.read && c.lastMessage.fromRole === "doctor" && (
                          <span className="rounded-full bg-[#D98B6E] px-2 py-0.5 text-[0.55rem] font-bold text-white anim-breathe">New</span>
                        )}
                      </div>
                      <p className="mt-3 font-serif text-base font-semibold leading-tight">{c.doctorName}</p>
                      <p className="text-xs text-[#9A8F84]">{c.doctorSpecialty || "Doctor"}</p>
                      <div className="mt-2 flex items-center gap-1.5 text-[0.65rem] text-[#9A8F84]">
                        <Clock className="h-3 w-3" />
                        Last consult: <span className="font-medium text-[#5C544D]">{relativeTime(c.lastConsultDate)}</span>
                      </div>
                    </div>

                    {/* last message preview */}
                    {c.lastMessage && (
                      <div className="border-t border-[#E5DFD4] px-5 py-2.5">
                        <p className="line-clamp-1 text-xs text-[#9A8F84]">
                          <span className="font-medium text-[#5C544D]">{c.lastMessage.fromRole === "doctor" ? "Doctor: " : "You: "}</span>
                          {c.lastMessage.text}
                        </p>
                      </div>
                    )}

                    {/* actions */}
                    <div className="grid grid-cols-3 gap-1.5 p-3">
                      <button
                        onClick={() => setActiveConn(c)}
                        className="flex flex-col items-center gap-1 rounded-xl bg-white/80 px-2 py-2.5 text-[0.65rem] font-medium text-[#5C544D] ring-1 ring-[#E5DFD4] transition-all hover:bg-white hover:shadow-sm"
                      >
                        <MessageCircle className="h-4 w-4 text-[#D98B6E]" />
                        Chat
                      </button>
                      <button
                        onClick={() => startCall(c, "voice")}
                        className="flex flex-col items-center gap-1 rounded-xl bg-white/80 px-2 py-2.5 text-[0.65rem] font-medium text-[#5C544D] ring-1 ring-[#E5DFD4] transition-all hover:bg-white hover:shadow-sm"
                      >
                        <Phone className="h-4 w-4 text-[#9DB89E]" />
                        Voice
                      </button>
                      <button
                        onClick={() => startCall(c, "video")}
                        className="flex flex-col items-center gap-1 rounded-xl bg-white/80 px-2 py-2.5 text-[0.65rem] font-medium text-[#5C544D] ring-1 ring-[#E5DFD4] transition-all hover:bg-white hover:shadow-sm"
                      >
                        <Video className="h-4 w-4 text-[#C98A7A]" />
                        Video
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Privacy note */}
            <div className="mt-8 flex items-center justify-center gap-2 text-center text-[0.7rem] text-[#9A8F84]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#9DB89E]" />
              <span>All conversations are end-to-end secured · ABDM &amp; HIPAA-aligned</span>
            </div>
          </>
        )}
      </main>

      {/* ── Chat drawer ─────────────────────────────────────── */}
      <AnimatePresence>
        {activeConn && (
          <ChatDrawer
            conn={activeConn}
            patientName={patientName || "You"}
            messages={messages}
            messagesLoading={messagesLoading}
            draft={draft}
            setDraft={setDraft}
            sendMessage={sendMessage}
            onClose={() => setActiveConn(null)}
            messagesEndRef={messagesEndRef}
            onStartCall={(t) => { startCall(activeConn, t); }}
          />
        )}
      </AnimatePresence>

      {/* ── Call overlay ────────────────────────────────────── */}
      <AnimatePresence>
        {activeCall && (
          <PatientCallOverlay
            call={activeCall}
            patientName={patientName || "You"}
            onEnd={(duration) => { endCall(activeCall.callId, duration); setActiveCall(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Chat drawer (slides up from bottom on mobile, side on desktop) ── */

function ChatDrawer({
  conn, patientName, messages, messagesLoading, draft, setDraft, sendMessage, onClose, messagesEndRef, onStartCall,
}: {
  conn: Connection;
  patientName: string;
  messages: Message[];
  messagesLoading: boolean;
  draft: string;
  setDraft: (v: string) => void;
  sendMessage: () => void;
  onClose: () => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onStartCall: (t: "voice" | "video") => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 flex items-end justify-end bg-black/40 backdrop-blur-sm sm:items-stretch"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", damping: 26, stiffness: 280 }}
        onClick={(e) => e.stopPropagation()}
        className="flex h-[85vh] w-full flex-col rounded-t-3xl bg-[#FBF7F2] shadow-depth-lg sm:h-full sm:max-w-md sm:rounded-none"
      >
        {/* header */}
        <header className="flex items-center justify-between border-b border-[#E5DFD4] bg-white/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-[#D98B6E] to-[#C98A7A] text-xs font-bold text-white">
              {avatarInitials(conn.doctorName)}
            </span>
            <div>
              <p className="text-sm font-semibold">{conn.doctorName}</p>
              <p className="text-[0.65rem] text-[#9A8F84]">{conn.doctorSpecialty || "Doctor"}</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button onClick={() => onStartCall("voice")} className="grid h-8 w-8 place-items-center rounded-full text-[#9DB89E] ring-1 ring-[#E5DFD4] hover:bg-[#9DB89E]/10" title="Voice call"><Phone className="h-3.5 w-3.5" /></button>
            <button onClick={() => onStartCall("video")} className="grid h-8 w-8 place-items-center rounded-full text-[#D98B6E] ring-1 ring-[#E5DFD4] hover:bg-[#D98B6E]/10" title="Video call"><Video className="h-3.5 w-3.5" /></button>
            <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full text-[#9A8F84] hover:bg-[#F3EEE6]"><X className="h-4 w-4" /></button>
          </div>
        </header>

        {/* messages */}
        <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          {messagesLoading ? (
            <div className="grid h-40 place-items-center"><Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" /></div>
          ) : messages.length === 0 ? (
            <div className="grid h-40 place-items-center text-center">
              <div>
                <MessageCircle className="mx-auto h-8 w-8 text-[#E5DFD4]" />
                <p className="mt-2 text-sm text-[#9A8F84]">Say hello to your doctor</p>
              </div>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((m, i) => {
                const isPatient = m.fromRole === "patient";
                const prev = messages[i - 1];
                const showAvatar = !prev || prev.fromRole !== m.fromRole;
                return (
                  <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-end gap-2", isPatient && "justify-end")}>
                    {!isPatient && (
                      <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#9DB89E] to-[#5A7A5B] text-[0.55rem] font-bold text-white", !showAvatar && "opacity-0")}>
                        {avatarInitials(conn.doctorName)}
                      </span>
                    )}
                    <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2 text-sm shadow-sm", isPatient ? "bg-[#D98B6E] text-white rounded-br-sm" : "glass-soft text-[#1F1B17] rounded-bl-sm")}>
                      <p className="whitespace-pre-wrap leading-snug">{m.text}</p>
                      <div className={cn("mt-1 flex items-center justify-end gap-1 text-[0.55rem]", isPatient ? "text-white/70" : "text-[#9A8F84]")}>
                        <span>{relativeTime(m.createdAt)}</span>
                        {isPatient && (m.read ? <CheckCheck className="h-3 w-3 text-white/80" /> : <Check className="h-3 w-3 text-white/60" />)}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* input */}
        <div className="border-t border-[#E5DFD4] bg-white/80 px-4 py-3 backdrop-blur-md">
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder={`Message ${conn.doctorName}…`}
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
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ── Patient call overlay (simpler — no Rx panel) ── */

function PatientCallOverlay({
  call, patientName, onEnd,
}: {
  call: { callId: string; type: "voice" | "video"; doctor: Connection };
  patientName: string;
  onEnd: (durationSec: number) => void;
}) {
  const [seconds, setSeconds] = useState(0);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  const timer = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  const color = SPECIALTY_COLOR[call.doctor.doctorSpecialty || "default"] || SPECIALTY_COLOR.default;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-[#0E0C0A] text-white"
    >
      <div className="relative flex-1 grid place-items-center mesh-bg-dark">
        <div className="text-center">
          <div className="relative mx-auto h-32 w-32">
            <span className="absolute inset-0 rounded-full anim-breathe" style={{ background: color }} />
            <span className="absolute inset-2 grid place-items-center rounded-full font-serif text-4xl font-bold text-white shadow-depth" style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
              {avatarInitials(call.doctor.doctorName)}
            </span>
            <span className="pulse-ring absolute inset-0 rounded-full" />
          </div>
          <p className="mt-4 font-serif text-xl font-semibold">{call.doctor.doctorName}</p>
          <p className="text-xs text-white/60">{call.doctor.doctorSpecialty || "Doctor"}</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-[#9DB89E] anim-breathe" /> Live
            </span>
            <span className="font-mono text-xs tabular-nums text-white/80">{timer}</span>
          </div>
          <p className="mt-3 text-[0.65rem] text-white/40">Connecting securely · end-to-end encrypted</p>
        </div>

        <button
          onClick={() => onEnd(seconds)}
          className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-[#C98A7A] px-5 py-3 text-sm font-semibold text-white shadow-depth transition-all hover:scale-105 hover:bg-[#A55A4A]"
        >
          <PhoneOff className="h-4 w-4" /> End Call
        </button>
      </div>
    </motion.div>
  );
}
