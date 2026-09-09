"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Users, User, Plus, Phone, Droplet, Cake, Heart, Info,
  X, Loader2, ShieldCheck, Sparkles, UserRound, UserCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { DashboardData, FamilyMember } from "../portal-types";

type Props = {
  data: DashboardData;
  onChanged: () => void;
};

const RELATIONS = ["spouse", "son", "daughter", "father", "mother", "brother", "sister", "other"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export function FamilyTab({ data, onChanged }: Props) {
  const [addOpen, setAddOpen] = useState(false);
  const self = data.user;

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-[#E7E5E4] bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[#D98B6E]/10 text-[#D98B6E]">
              <Users className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-display text-xl font-semibold text-stone-800">Family Health</h1>
              <p className="text-sm text-stone-500">Track health records for your loved ones.</p>
            </div>
          </div>
          <Button
            onClick={() => setAddOpen(true)}
            className="rounded-full bg-[#D98B6E] text-white hover:bg-[#C97759] active:scale-95"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Add member</span>
          </Button>
        </div>
      </motion.div>

      {/* Self card */}
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="overflow-hidden rounded-3xl border border-[#E7E5E4] bg-gradient-to-br from-[#D98B6E] to-[#9DB89E] p-6 text-white shadow-[0_8px_32px_-12px_oklch(0.5_0.10_45/0.4)]"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-16 w-16 place-items-center rounded-3xl bg-white/20 backdrop-blur">
            <UserCircle className="h-9 w-9" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h2 className="font-display text-xl font-semibold">{self.fullName}</h2>
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-[0.65rem] font-semibold backdrop-blur">
                Self
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-white/85">
              {self.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {self.phone}
                </span>
              )}
              {self.bloodGroup && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
                  <Droplet className="h-3 w-3" />
                  {self.bloodGroup}
                </span>
              )}
              {self.abhaId && (
                <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  ABHA {self.abhaId}
                </span>
              )}
            </div>
          </div>
        </div>
      </motion.section>

      {/* Info banner */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-3 rounded-2xl border border-[#9DB89E]/30 bg-[#9DB89E]/8 p-4"
      >
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-[#5E8A60]" />
        <p className="text-xs leading-relaxed text-stone-600">
          <span className="font-semibold text-stone-700">Why add family members?</span> Linked members can receive
          phlebotomist visits, view shared insurance, and access their own portal with the same phone-first login.
          Your records are always kept private — only you can grant access.
        </p>
      </motion.div>

      {/* Family members grid */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-stone-800">
          <Users className="h-5 w-5 text-[#D98B6E]" />
          Family members
          <span className="rounded-full bg-[#D98B6E]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#D98B6E]">
            {data.familyMembers.length}
          </span>
        </h2>

        {data.familyMembers.length === 0 ? (
          <div className="rounded-3xl border border-[#E7E5E4] bg-white p-10 text-center shadow-sm">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#9DB89E]/15 text-[#9DB89E]">
              <UserRound className="h-7 w-7" />
            </div>
            <p className="mt-3 font-display text-lg font-semibold text-stone-800">No family members added yet</p>
            <p className="mt-1 text-sm text-stone-500">Add a spouse, child, or parent to manage their health together.</p>
            <button
              onClick={() => setAddOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#D98B6E] px-4 py-2 text-sm font-semibold text-white hover:bg-[#C97759]"
            >
              <Plus className="h-4 w-4" />
              Add member
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.familyMembers.map((m, i) => (
              <FamilyCard key={m.id} member={m} delay={i * 0.05} />
            ))}
          </div>
        )}
      </section>

      {/* Add modal */}
      <AddMemberModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onAdded={() => {
          setAddOpen(false);
          onChanged();
        }}
      />
    </div>
  );
}

function FamilyCard({ member, delay }: { member: FamilyMember; delay: number }) {
  const initials = member.fullName.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group rounded-3xl border border-[#E7E5E4] bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_4px_12px_-4px_oklch(0.4_0.05_45/0.1)]"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-[#D98B6E]/15 to-[#9DB89E]/15 font-display text-base font-semibold text-[#D98B6E]">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-display text-sm font-semibold text-stone-800">{member.fullName}</p>
          </div>
          <p className="text-[0.7rem] font-medium capitalize text-stone-400">{member.relationToHead ?? "—"}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {member.bloodGroup && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#D98B6E]/10 px-2 py-0.5 text-[0.65rem] font-semibold text-[#D98B6E]">
                <Droplet className="h-2.5 w-2.5" />
                {member.bloodGroup}
              </span>
            )}
            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] font-medium capitalize text-stone-500">
              {member.gender ?? "—"}
            </span>
            {member.dob && (
              <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-[0.65rem] text-stone-500">
                <Cake className="h-2.5 w-2.5" />
                {calcAge(member.dob)}y
              </span>
            )}
          </div>
          <p className="mt-1.5 flex items-center gap-1 text-[0.7rem] text-stone-400">
            <Phone className="h-2.5 w-2.5" />
            {member.phone}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function AddMemberModal({
  open, onOpenChange, onAdded,
}: { open: boolean; onOpenChange: (v: boolean) => void; onAdded: () => void }) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [relation, setRelation] = useState("spouse");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("male");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [loading, setLoading] = useState(false);

  const reset = () => {
    setFullName(""); setPhone(""); setRelation("spouse"); setDob(""); setGender("male"); setBloodGroup("O+");
  };

  const submit = async () => {
    if (!fullName || !phone) {
      toast.error("Please enter full name and phone");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/portal/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, phone, relation, dob, gender, bloodGroup }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Failed to add member");
      toast.success(`${fullName} added to family`);
      reset();
      onAdded();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add member");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#D98B6E] via-[#C97759] to-[#9DB89E] p-6 text-white">
          <div aria-hidden className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/15 blur-2xl" style={{ animation: "nexura-breathe 6s ease-in-out infinite" }} />
          <DialogHeader className="relative space-y-1.5 p-0">
            <div className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-2xl bg-white/20 backdrop-blur">
                <Heart className="h-5 w-5" />
              </span>
              <DialogTitle className="font-display text-xl">Add family member</DialogTitle>
            </div>
            <DialogDescription className="text-white/85">
              They&apos;ll be able to log in with their own phone number.
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="space-y-3 p-6">
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Lakshmi Nair" />
          </Field>
          <Field label="Mobile number">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 98200 99999" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Relation">
              <select
                value={relation}
                onChange={(e) => setRelation(e.target.value)}
                className="h-10 w-full rounded-md border border-[#E7E5E4] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D98B6E]/20"
              >
                {RELATIONS.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
              </select>
            </Field>
            <Field label="Gender">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="h-10 w-full rounded-md border border-[#E7E5E4] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D98B6E]/20"
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date of birth">
              <Input type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </Field>
            <Field label="Blood group">
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="h-10 w-full rounded-md border border-[#E7E5E4] bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#D98B6E]/20"
              >
                {BLOOD_GROUPS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
          </div>
          <div className="flex items-center gap-1.5 rounded-xl bg-[#9DB89E]/8 p-2 text-[0.7rem] text-stone-500">
            <ShieldCheck className="h-3 w-3 text-[#5E8A60]" />
            Records are private — only this member can access them after phone login.
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-[#E7E5E4] bg-[#FAF7F2] p-4">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="rounded-full">
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={loading}
            className="rounded-full bg-[#D98B6E] text-white hover:bg-[#C97759]"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {loading ? "Adding…" : "Add member"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-stone-500">{label}</Label>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}

function calcAge(dob: string): number {
  const d = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return Math.max(0, age);
}

// avoid unused warnings
void X; void Sparkles; void AnimatePresence; void User;
