"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, X, CheckCheck, MessageCircle, Stethoscope, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

/* ============ Types ============ */
export type ChatMessage = {
  id: string;
  fromRole: string;
  fromName: string | null;
  text: string;
  attachmentType: string | null;
  attachmentUrl: string | null;
  read: boolean;
  createdAt: string;
};

type Props = {
  connectionId: string;
  patientName: string;
  doctorName: string;
  doctorSpecialty?: string | null;
  /**
   * Optional system intro message (e.g. the WhatsApp notification text the
   * Connect API returned when the connection was first created). Rendered as a
   * muted, centered system row above the message list.
   */
  introSystemMessage?: string | null;
  /** When `true` the widget renders inside a fixed overlay; otherwise inline. */
  asOverlay?: boolean;
  onClose?: () => void;
  /** Compact mode = smaller header (used inside KYH result cards). */
  compact?: boolean;
};

/**
 * PatientChatWidget — a self-contained, reusable chat panel that talks to the
 * Connect messages API. Sends messages as `fromRole: "patient"`. Polls every
 * 6s for inbound doctor replies.
 *
 * Used by:
 *   - KYH symptom-checker (inline widget after "Chat with a Doctor" CTA)
 *   - Patient Connect dashboard (modal chat panel)
 */
export function PatientChatWidget({
  connectionId,
  patientName,
  doctorName,
  doctorSpecialty,
  introSystemMessage,
  asOverlay = false,
  onClose,
  compact = false,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const initials = doctorName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const patientInitials = patientName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/connect/messages?connectionId=${encodeURIComponent(connectionId)}`,
      );
      if (!res.ok) return;
      const d = await res.json();
      setMessages(d.messages || []);
      // Mark doctor messages as read (patient is viewing the thread)
      await fetch("/api/connect/messages/read", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId, readByRole: "patient" }),
      }).catch(() => {});
    } catch {
      /* swallow — chat is best-effort */
    } finally {
      setLoading(false);
    }
  }, [connectionId]);

  useEffect(() => {
    load();
    const id = setInterval(load, 6000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");
    // Optimistic message so the patient sees their message instantly
    const optimistic: ChatMessage = {
      id: `tmp-${Date.now()}`,
      fromRole: "patient",
      fromName: patientName,
      text,
      attachmentType: null,
      attachmentUrl: null,
      read: false,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    try {
      const res = await fetch("/api/connect/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          connectionId,
          fromRole: "patient",
          fromName: patientName,
          text,
        }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (d?.message) {
        setMessages((prev) => prev.map((m) => (m.id === optimistic.id ? d.message : m)));
      }
    } catch {
      toast.error("Message not delivered — please try again");
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const containerCls = asOverlay
    ? "fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm"
    : "";

  const body = (
    <motion.div
      initial={asOverlay ? { scale: 0.96, y: 16, opacity: 0 } : { opacity: 0, y: 8 }}
      animate={{ scale: 1, y: 0, opacity: 1 }}
      exit={asOverlay ? { scale: 0.96, y: 16, opacity: 0 } : { opacity: 0 }}
      onClick={asOverlay ? (e) => e.stopPropagation() : undefined}
      className={cn(
        "flex flex-col overflow-hidden rounded-2xl bg-white shadow-depth-lg",
        asOverlay ? "h-[80vh] w-full max-w-lg" : "h-[28rem] w-full",
        compact ? "text-sm" : "text-base",
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-[#EFE9E0] bg-white/80 px-4 py-3 backdrop-blur-xl">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#A16207] to-[#8F5E06] text-xs font-bold text-white shadow-md">
          {initials || "DR"}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-sm font-semibold text-[#1F1B17]">{doctorName}</p>
          <p className="text-[0.65rem] text-[#9A8F84]">{doctorSpecialty || "General Physician"}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid h-8 w-8 place-items-center rounded-full text-[#9A8F84] transition-colors hover:bg-[#F3EEE6] hover:text-[#1F1B17]"
            aria-label="Close chat"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto bg-[#FAF7F2] px-4 py-4">
        {loading ? (
          <div className="grid h-full place-items-center">
            <Loader2 className="h-5 w-5 animate-spin text-[#9A8F84]" />
          </div>
        ) : (
          <>
            {introSystemMessage && (
              <div className="mb-2 flex justify-center">
                <span className="rounded-full glass-chip px-3 py-1 text-center text-[0.6rem] text-[#9A8F84]">
                  {introSystemMessage}
                </span>
              </div>
            )}
            {messages.length === 0 ? (
              <div className="grid h-full place-items-center text-center">
                <MessageCircle className="mb-2 h-8 w-8 text-[#9A8F84]/40" />
                <p className="text-sm text-[#9A8F84]">Say hello to {doctorName}</p>
                <p className="mt-1 text-[0.65rem] text-[#B5A99E]">
                  Your message lands in your doctor's Connect inbox
                </p>
              </div>
            ) : (
              messages.map((m, i) => {
                const isPatient = m.fromRole === "patient";
                const showAvatar = i === 0 || messages[i - 1].fromRole !== m.fromRole;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.015, 0.3) }}
                    className={cn("flex gap-2", isPatient ? "justify-end" : "justify-start")}
                  >
                    {!isPatient && (
                      <span className={cn("w-7 shrink-0", showAvatar && "grid place-items-center")}>
                        {showAvatar && (
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-[#A16207] to-[#8F5E06] text-[0.55rem] font-bold text-white">
                            {initials}
                          </span>
                        )}
                      </span>
                    )}
                    <div
                      className={cn(
                        "max-w-[78%] rounded-2xl px-3.5 py-2 text-sm shadow-sm",
                        isPatient ? "bg-[#A16207] text-white" : "glass-soft text-[#1F1B17]",
                      )}
                    >
                      <p className="leading-snug">{m.text}</p>
                      <div
                        className={cn(
                          "mt-0.5 flex items-center justify-end gap-1 text-[0.55rem]",
                          isPatient ? "text-white/70" : "text-[#9A8F84]",
                        )}
                      >
                        {new Date(m.createdAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isPatient &&
                          (m.read ? (
                            <CheckCheck className="h-3 w-3" />
                          ) : (
                            <CheckCheck className="h-3 w-3 opacity-50" />
                          ))}
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </>
        )}
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 border-t border-[#EFE9E0] bg-white p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="Type a message…"
          className="glass-input flex-1 rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button
          onClick={send}
          disabled={!input.trim() || sending}
          className="grid h-9 w-9 place-items-center rounded-full bg-[#A16207] text-white shadow-md transition-all hover:scale-110 disabled:opacity-40"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </motion.div>
  );

  return asOverlay ? (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className={containerCls}
        onClick={onClose}
      >
        {body}
      </motion.div>
    </AnimatePresence>
  ) : (
    body
  );
}

/* ============ Connect CTA Button (used by KYH + patient view) ============ */

export function ConnectDoctorCta({
  onClick,
  loading,
  label = "Chat with a Doctor",
  note = "Free first consultation · Powered by Nexura Connect",
}: {
  onClick: () => void;
  loading?: boolean;
  label?: string;
  note?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      className="rounded-2xl glass-soft p-4 shadow-depth"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[#A16207] to-[#C9962E] text-white shadow-md">
            <Stethoscope className="h-5 w-5" />
          </span>
          <div>
            <p className="font-serif text-sm font-semibold text-[#1F1B17]">{label}</p>
            <p className="text-[0.65rem] text-[#9A8F84]">{note}</p>
          </div>
        </div>
        <button
          onClick={onClick}
          disabled={loading}
          className="flex items-center justify-center gap-2 rounded-full bg-[#A16207] px-5 py-2.5 text-sm font-semibold text-white shadow-depth transition-all hover:scale-[1.02] hover:bg-[#8A5A04] disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Connecting…
            </>
          ) : (
            <>
              <MessageCircle className="h-4 w-4" /> {label}
            </>
          )}
        </button>
      </div>
    </motion.div>
  );
}
