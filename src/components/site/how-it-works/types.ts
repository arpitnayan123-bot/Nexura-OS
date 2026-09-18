import type { LucideIcon } from "lucide-react";

export type GroupId = "start" | "patients" | "clinical" | "platform";

export type HiwGroup = {
  id: GroupId;
  label: string;
  blurb: string;
};

export type HiwStep = {
  title: string;
  desc: string;
};

export type HiwCta =
  { kind: "link"; label: string; href: string } | { kind: "booking"; label: string };

export type HiwSection = {
  id: string;
  group: GroupId;
  icon: LucideIcon;
  accent: string;
  title: string;
  kicker: string;
  minutes: string;
  steps: HiwStep[];
  hood: string[];
  cta?: HiwCta;
};

export const GROUPS: HiwGroup[] = [
  { id: "start", label: "Start here", blurb: "The 60-second mental model" },
  { id: "patients", label: "For patients", blurb: "Care from the couch" },
  { id: "clinical", label: "For clinicians", blurb: "Inside the hospital engine room" },
  { id: "platform", label: "The platform", blurb: "Bones, brains and trust" },
];
