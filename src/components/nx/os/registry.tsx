"use client";

import type { ReactNode } from "react";
import {
  Activity, BarChart3, BedDouble, Boxes, CalendarDays, ClipboardList, FlaskConical, FolderOpen, HeartPulse,
  LayoutDashboard, ListTodo, MessageSquare, Pill as PillIcon, Receipt, ScrollText, Settings,
  ShieldAlert, Siren, SquareTerminal, Stethoscope, Syringe, Users, Workflow,
} from "lucide-react";

import { CommandCenter } from "../mod-command";
import { PatientRegistry } from "../mod-patients";
import { TaskInbox } from "../mod-tasks";
import { BedBoard } from "../mod-beds";
import { EdBoard } from "../mod-ed";
import { ClinicianWorkspace } from "../mod-workspace";
import { OrBoard } from "../mod-or";
import { LabQueue } from "../mod-labs";
import { PharmacyQueue } from "../mod-pharmacy";
import { OrdersCenter } from "../mod-orders";
import { ScheduleBoard } from "../mod-schedule";
import { BillingCenter } from "../mod-billing";
import { SupplyCenter } from "../mod-supply";
import { AnalyticsCenter } from "../mod-analytics";
import { IncidentCenter } from "../mod-incidents";
import { AutomationBuilder } from "../mod-automations";
import { MessagesCenter } from "../mod-messages";
import { AdminCenter } from "../mod-admin";
import { SettingsApp } from "./settings-app";
import { FilesApp } from "./files-app";
import { ConsoleApp } from "./console-app";

/* ============================================================
   HOSPITAL OS — application registry
   Single source of truth for every installable app surface.
   ============================================================ */

export interface AppCtx {
  open: (key: string) => void;
  openPatient: (id: string) => void;
}

export interface AppDef {
  key: string;
  label: string;
  group: "Overview" | "Clinical" | "Operations" | "System";
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  badge?: "tasks" | "incidents";
  system?: boolean; // always available, not RBAC-filtered
  render: (ctx: AppCtx) => ReactNode;
}

export const APPS: AppDef[] = [
  { key: "command-center", label: "Command Center", group: "Overview", icon: LayoutDashboard, desc: "Live census, beds, ED, OR and critical alerts", render: (c) => <CommandCenter onOpenModule={c.open} /> },
  { key: "doctor", label: "Doctor Workspace", group: "Overview", icon: Stethoscope, desc: "Your patients, risk-sorted, with AI handover", render: () => <ClinicianWorkspace kind="doctor" /> },
  { key: "nurse", label: "Nurse Shift", group: "Overview", icon: HeartPulse, desc: "Shift tasks, vitals due and handover", render: () => <ClinicianWorkspace kind="nurse" /> },
  { key: "tasks", label: "Work Queue", group: "Overview", icon: ListTodo, desc: "Priority-ranked tasks with transparent reasons", badge: "tasks", render: () => <TaskInbox /> },
  { key: "patients", label: "Patient Records", group: "Clinical", icon: Users, desc: "Universal patient records and care journey", render: () => <PatientRegistry /> },
  { key: "orders", label: "Orders & Results", group: "Clinical", icon: ClipboardList, desc: "Order lifecycle, results and validation", render: () => <OrdersCenter /> },
  { key: "labs", label: "Laboratory", group: "Clinical", icon: FlaskConical, desc: "Specimen queue and result validation", render: () => <LabQueue /> },
  { key: "pharmacy", label: "Pharmacy", group: "Clinical", icon: PillIcon, desc: "Verification, allergy flags and stock", render: () => <PharmacyQueue /> },
  { key: "or", label: "Operating Rooms", group: "Clinical", icon: Syringe, desc: "OR schedule and readiness checklists", render: () => <OrBoard /> },
  { key: "ed", label: "Emergency", group: "Clinical", icon: Siren, desc: "ED board with acuity and wait times", render: () => <EdBoard /> },
  { key: "beds", label: "Beds & Rooms", group: "Operations", icon: BedDouble, desc: "Bed lifecycle from occupied to ready", render: () => <BedBoard /> },
  { key: "schedule", label: "Scheduling", group: "Operations", icon: CalendarDays, desc: "Day board, check-in and booking", render: () => <ScheduleBoard /> },
  { key: "incidents", label: "Incidents", group: "Operations", icon: ShieldAlert, desc: "Report, track and resolve incidents", badge: "incidents", render: () => <IncidentCenter /> },
  { key: "messages", label: "Care Communication", group: "Operations", icon: MessageSquare, desc: "Secure care-team channels", render: () => <MessagesCenter /> },
  { key: "equipment", label: "Equipment & Supply", group: "Operations", icon: Boxes, desc: "Assets, inventory and low-stock alerts", render: () => <SupplyCenter /> },
  { key: "automations", label: "Automations", group: "System", icon: Workflow, desc: "Rules, triggers and run history", render: () => <AutomationBuilder /> },
  { key: "analytics", label: "Analytics", group: "System", icon: BarChart3, desc: "KPIs, trends and leadership views", render: () => <AnalyticsCenter /> },
  { key: "billing", label: "Revenue Cycle", group: "System", icon: Receipt, desc: "Claims, billing and payments", render: () => <BillingCenter /> },
  { key: "audit", label: "Audit Trail", group: "System", icon: ScrollText, desc: "Tamper-evident chain of every action", render: () => <AdminCenter view="audit" /> },
  { key: "admin", label: "Administration", group: "System", icon: Settings, desc: "Staff, integrations and security", render: () => <AdminCenter view="admin" /> },
  { key: "files", label: "Documents", group: "System", icon: FolderOpen, desc: "Dossiers, orders with results and reports", system: true, render: (c) => <FilesApp ctx={c} /> },
  { key: "console", label: "Console", group: "System", icon: SquareTerminal, desc: "Terminal over the live hospital APIs", system: true, render: (c) => <ConsoleApp ctx={c} /> },
  { key: "settings", label: "System Settings", group: "System", icon: Settings, desc: "Appearance, accessibility and account", system: true, render: () => <SettingsApp /> },
];

export const APP_MAP: Record<string, AppDef> = Object.fromEntries(APPS.map((a) => [a.key, a]));

export function appFor(key: string): AppDef | undefined {
  return APP_MAP[key];
}
