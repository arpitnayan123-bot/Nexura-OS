/* ============================================================
 * NEXURA DIY — ERROR CODES + ZOD SCHEMAS
 * Every /api/diy route validates its body through these.
 * ============================================================ */

import { z } from "zod";
import { CONSENT_SCOPES, DIY_CATEGORIES } from "./types";

export const DIY_ERROR_CODES = {
  UNAUTHENTICATED: "DIY_001",
  INVALID_BODY: "DIY_005",
  RATE_LIMITED: "DIY_029",
  CONSENT_REQUIRED: "DIY_010",
  NOT_FOUND: "DIY_020",
  STATE_FORBIDDEN: "DIY_021",
  CONFLICT: "DIY_022",
  UNSAFE_CONTENT: "DIY_030",
  EMERGENCY: "DIY_041",
  INTERNAL: "DIY_500",
} as const;

const trim1 = z.string().trim();
export const goalTextSchema = trim1
  .min(3, "Tell me a little more")
  .max(600, "Keep each goal under 600 characters");

export const parseRequestSchema = z.object({
  text: trim1
    .min(3, "Say a bit more")
    .max(4000, "That is a lot — split it into a second message")
    .pipe(z.string()),
  source: z.enum(["chat", "voice"]).default("chat"),
});

export const goalsBatchSchema = z.object({
  batchId: trim1.min(6).max(64),
  goals: z
    .array(
      z.object({
        clientKey: trim1.min(1).max(64),
        rawGoalText: goalTextSchema,
        category: z.enum(DIY_CATEGORIES),
        requestedTimeframeDays: z.number().int().min(7).max(730).nullable().optional(),
      }),
    )
    .min(1, "Add at least one goal")
    .max(8, "Let us start with at most 8 goals"),
});

export const goalActionSchema = z.object({
  action: z.enum([
    "confirm",
    "clarify",
    "pause",
    "resume",
    "complete",
    "archive",
    "not_feasible",
    "reparse",
  ]),
  rawGoalText: goalTextSchema.optional(),
  category: z.enum(DIY_CATEGORIES).optional(),
});

export const taskActionSchema = z.object({
  action: z.enum(["done", "skipped", "not_feasible", "note"]),
  note: z.string().trim().max(500).optional(),
});

export const consentGrantSchema = z.object({
  scopes: z.array(z.enum(CONSENT_SCOPES)).min(1).max(CONSENT_SCOPES.length),
  policyVersion: z.string().trim().min(3).default("2026-09-diy-1"),
  source: z.string().trim().min(2).max(40),
});

export const consentWithdrawSchema = z.object({
  scopes: z.array(z.enum(CONSENT_SCOPES)).min(1),
});

export const progressSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "date must be YYYY-MM-DD"),
  completedTasks: z.number().int().min(0).max(200),
  skippedTasks: z.number().int().min(0).max(200),
  symptoms: z.string().trim().max(500).optional(),
  mood: z.number().int().min(1).max(5).optional(),
  energy: z.number().int().min(1).max(5).optional(),
  sleep: z.number().int().min(1).max(5).optional(),
  userNotes: z.string().trim().max(1000).optional(),
});

export const checkinSchema = z.object({
  mood: z.number().int().min(1).max(5),
  energy: z.number().int().min(1).max(5),
  sleep: z.number().int().min(1).max(5),
  userNotes: z.string().trim().max(1000).optional(),
});

export const skincareStartSchema = z.object({
  level: z.enum(["minimal", "core", "full"]),
  sensitiveSkin: z.boolean().default(false),
  pregnantOrBreastfeeding: z.boolean().default(false),
});

export const skincareEventSchema = z.object({
  eventType: z.enum(["irritation", "patch_reaction", "breakout_spike", "other"]),
  detail: z.string().trim().max(500).optional(),
  severity: z.enum(["mild", "moderate", "severe"]).default("mild"),
});

export const contextSchema = z.object({
  ageBand: z.enum(["under_18", "18_25", "26_35", "36_45", "46_60", "over_60"]).optional(),
  conditions: z.array(z.string().trim().max(60)).max(12).optional(),
  dietPreference: z.enum(["veg", "eggetarian", "non_veg", "vegan", "jain", "other"]).optional(),
  budget: z.enum(["low", "medium", "high"]).optional(),
  culturalNotes: z.string().trim().max(300).optional(),
});
