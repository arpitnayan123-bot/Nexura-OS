import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { guard, ok, fail, parseBody, withRoute } from "@/lib/nx/api";

/* Adaptive symptom decision trees + synthetic patient simulations.
   GET  → scenario list (audience-filtered)
   POST → walk the tree with chosen options; deterministic scoring. */

export const GET = withRoute("simulations.list", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const audience = req.nextUrl.searchParams.get("audience");
  const scenarios = await db.nxSimulationScenario.findMany({
    where: { active: true, ...(audience ? { audience } : {}) },
    orderBy: { difficulty: "asc" },
  });
  return ok(
    scenarios.map((s) => ({
      id: s.id,
      code: s.code,
      title: s.title,
      audience: s.audience,
      difficulty: s.difficulty,
      tree: JSON.parse(s.treeJson),
    })),
    { requestId },
  );
});

const RunSchema = z.object({
  scenarioId: z.string().min(4),
  choices: z.array(z.string().min(1).max(80)).min(1).max(10), // option labels in order
  subjectName: z.string().max(80).optional(),
});

interface TreeNode {
  id: string;
  question: string;
  options: { label: string; correct: boolean; next: TreeNode | null }[];
}

export const POST = withRoute("simulations.run", async (req: NextRequest, { requestId }) => {
  const g = await guard(req, "patient.demographics.view");
  if ("response" in g) return g.response;
  const body = await parseBody(req, RunSchema);
  if ("response" in body) return body.response;
  const scenario = await db.nxSimulationScenario.findUnique({
    where: { id: body.data.scenarioId },
  });
  if (!scenario || !scenario.active) return fail("not_found", 404, undefined, requestId);
  const tree = JSON.parse(scenario.treeJson) as TreeNode;
  const steps: { step: number; question: string; chosen: string; correct: boolean }[] = [];
  let node: TreeNode | null = tree;
  let i = 0;
  while (node && i < body.data.choices.length) {
    const opt = node.options.find((o) => o.label === body.data.choices[i]);
    if (!opt)
      return fail(
        "invalid_choice",
        400,
        `Step ${i + 1}: "${body.data.choices[i]}" is not an option here.`,
        requestId,
      );
    steps.push({ step: i + 1, question: node.question, chosen: opt.label, correct: opt.correct });
    node = opt.next;
    i += 1;
  }
  const totalCorrect = steps.filter((s) => s.correct).length;
  const score = steps.length ? Number((totalCorrect / steps.length).toFixed(2)) : 0;
  const outcome =
    totalCorrect === steps.length && steps.length > 0
      ? "optimal_path"
      : totalCorrect > 0
        ? "partial"
        : "incorrect_path";
  const run = await db.nxSimulationRun.create({
    data: {
      scenarioId: scenario.id,
      subjectType: "staff",
      subjectName: body.data.subjectName ?? g.session.name,
      choicesJson: JSON.stringify(steps),
      outcome,
      score,
    },
  });
  return ok(
    {
      runId: run.id,
      outcome,
      score,
      steps,
      teachingNote:
        outcome === "optimal_path"
          ? "Textbook management."
          : "Review the guideline path — the tree shows where the chosen route diverged.",
    },
    { requestId },
  );
});
