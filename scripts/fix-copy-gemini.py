#!/usr/bin/env python3
"""Truth-in-copy sweep: replace stale third-party AI model claims with honest
neutral labels. The real backend is OpenRouter/GLM (server-side), so naming
'Gemini' in UI copy is factually wrong (same class of issue fixed in
prod-audit-1 for 'Powered by Gemini')."""
import re
import pathlib

FILES = [
    "src/components/know-your-health/tools.ts",
    "src/components/know-your-health/tools/derma-scan.tsx",
    "src/components/know-your-health/tools/xray-reader.tsx",
    "src/components/know-your-health/tools/health-quiz.tsx",
    "src/components/know-your-health/tools/symptoms-checker.tsx",
    "src/components/know-your-health/tools/food-scan.tsx",
    "src/components/know-your-health/tools/lab-analyzer.tsx",
]

REPLACEMENTS = [
    # poweredBy fields
    ('poweredBy:"Gemini 2.0 Flash Vision"', 'poweredBy:"Nexura AI Vision"'),
    ('poweredBy:"Gemini 2.0 Flash"', 'poweredBy:"Nexura AI"'),
    # description copy
    ("Gemini reviews them", "the AI reviews them"),
    ("Gemini reads the visible results", "the AI reads the visible results"),
    ("Gemini estimates your 10-year risk", "the AI estimates your 10-year risk"),
    ("Gemini describes the visible features", "the AI describes the visible features"),
    ("Gemini describes the visible anatomy", "the AI describes the visible anatomy"),
    ("Gemini identifies the dish", "the AI identifies the dish"),
    ("Tell Gemini your goal", "Tell the AI your goal"),
    ("Gemini interprets them", "the AI interprets them"),
    ("Gemini responds with warm", "the AI responds with warm"),
    ("Gemini maps your Prakriti", "the AI maps your Prakriti"),
    ("Gemini generates fresh questions", "Fresh AI-generated questions"),
    ("then Gemini adds a warm", "then the AI adds a warm"),
    ("Gemini classifies them", "the AI classifies them"),
    ("Gemini estimates your sleep efficiency", "the AI estimates your sleep efficiency"),
    ("Gemini checks for known", "the AI checks for known"),
    # footer strips in tool components
    ("Powered by Gemini Vision · Not a diagnosis", "AI-processed, not a diagnosis"),
    ("Powered by Gemini Vision · Educational use", "AI-processed · Educational use"),
    ("Fresh questions every time · powered by Gemini", "Fresh questions every time · AI-generated"),
    ("Powered by Gemini · Indian clinical context", "AI-processed · Indian clinical context"),
    ("Powered by Gemini Vision · Indian dish aware", "AI-processed · Indian dish aware"),
    ("Powered by Gemini · Indian reference ranges", "AI-processed · Indian reference ranges"),
]

total = 0
for f in FILES:
    p = pathlib.Path(f)
    s = p.read_text()
    orig = s
    n = 0
    for old, new in REPLACEMENTS:
        c = s.count(old)
        if c:
            s = s.replace(old, new)
            n += c
    if s != orig:
        p.write_text(s)
    print(f"{f}: {n} replacements")
    total += n
print(f"TOTAL: {total}")

# verify no 'Gemini' remains in user-visible strings (allow code comments)
left = []
for f in FILES:
    for i, line in enumerate(pathlib.Path(f).read_text().splitlines(), 1):
        if "Gemini" in line and not line.strip().startswith(("//", "*", "/*")):
            left.append(f"{f}:{i}: {line.strip()[:90]}")
print("\nREMAINING Gemini refs (excluding comments):")
for l in left or ["  none"]:
    print(l)
