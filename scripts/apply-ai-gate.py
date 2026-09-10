#!/usr/bin/env python3
"""Insert aiGate() into every AI-consuming POST route handler (idempotent)."""
import re, pathlib

ROOT = pathlib.Path("/home/z/my-project")
FILES = [
    "src/app/api/assistant/route.ts",
    "src/app/api/clinic/voice-soap/route.ts",
    "src/app/api/know-your-health/ayurveda/route.ts",
    "src/app/api/know-your-health/bp-analyzer/route.ts",
    "src/app/api/know-your-health/derma-scan/route.ts",
    "src/app/api/know-your-health/diabetes-care/route.ts",
    "src/app/api/know-your-health/diet-planner/route.ts",
    "src/app/api/know-your-health/disease-risk/route.ts",
    "src/app/api/know-your-health/food-scan/route.ts",
    "src/app/api/know-your-health/health-quiz/route.ts",
    "src/app/api/know-your-health/lab-analyzer/route.ts",
    "src/app/api/know-your-health/med-interaction/route.ts",
    "src/app/api/know-your-health/mental-wellness/route.ts",
    "src/app/api/know-your-health/sleep-quality/route.ts",
    "src/app/api/know-your-health/symptoms-checker/route.ts",
    "src/app/api/know-your-health/womens-care/route.ts",
    "src/app/api/know-your-health/xray-reader/route.ts",
    "src/app/api/pharmacy/ai-query/route.ts",
    "src/app/api/pharmacy/prescription-ocr/route.ts",
    "src/app/api/pharmacy/voice-bill/route.ts",
    "src/app/api/portal/ai-interpret/route.ts",
]
IMPORT = 'import { aiGate } from "@/lib/nx/ai-guard";\n'
GATE = '  const __ai = aiGate(req);\n  if (__ai) return __ai;\n'

for rel in FILES:
    p = ROOT / rel
    src = p.read_text()
    if "ai-guard" in src:
        print(f"SKIP (already gated): {rel}")
        continue
    # 1) add import after the last top-of-file import line
    lines = src.splitlines(keepends=True)
    last_import = max(i for i, l in enumerate(lines) if l.startswith("import "))
    lines.insert(last_import + 1, IMPORT)
    src = "".join(lines)
    # 2) insert gate right after each POST handler opening line
    pat = re.compile(r'(export async function POST\(req: NextRequest\) \{\n)')
    src, n = pat.subn(r"\1" + GATE, src)
    if n == 0:
        print(f"WARN no POST(req: NextRequest) match: {rel}")
    p.write_text(src)
    print(f"OK ({n} handler): {rel}")
