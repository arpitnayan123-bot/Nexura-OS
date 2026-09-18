#!/usr/bin/env python3
"""Codemod: replace inline Postgres-only `mode: "insensitive"` filters with
the dialect-aware ciFilter() helper from src/lib/nx/db-dialect.ts.

Required for the platform publish package: its embedded-SQLite Prisma client
has NO `mode` argument (and the engine rejects it at runtime), while the
sandbox Postgres client needs it for case-insensitive search.

Transform:
    { contains: EXPR, mode: "insensitive" as const }
  -> ciFilter(EXPR)
including the surrounding field key when the literal is the whole value:
    { name: { contains: q, mode: "insensitive" as const } }
  -> { name: ciFilter(q) }
"""

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path("/home/z/my-project")
SITES = [
    ln.split(":")[0].strip() for ln in Path("/tmp/mode-sites.txt").read_text().splitlines() if ln.strip()
]
FILES = sorted(set(SITES))
IMPORT_LINE = 'import { ciFilter } from "@/lib/nx/db-dialect";'

# 1) inner fragment: { contains: EXPR, mode: "insensitive" as const } -> ciFilter(EXPR)
INNER = re.compile(
    r"\{\s*contains:\s*([^{}]+?),\s*mode:\s*\"insensitive\"\s*as\s*const\s*\}"
)
# 2) collapse the now-redundant wrapper: { key: ciFilter(EXPR) } stays as-is (valid),
#    so nothing to do — but tidy double-brace artifact `{ { ... } }` if pattern 1
#    matched inside a wrapper we also collapse:
WRAPPER = re.compile(r"\{(\s*)([A-Za-z_$][\w$]*)\s*:\s*\{\s*contains:\s*([^{}]+?),\s*mode:\s*\"insensitive\"\s*as\s*const\s*\}\s*\}")

def process(path: Path) -> bool:
    src = path.read_text()
    orig = src

    def wrap_repl(m: re.Match) -> str:
        key, expr = m.group(2), m.group(3).strip()
        return f"{{{key}: ciFilter({expr})}}"

    src = WRAPPER.sub(wrap_repl, src)
    src = INNER.sub(lambda m: f"ciFilter({m.group(1).strip()})", src)

    if src == orig:
        return False

    if "ciFilter(" in src and IMPORT_LINE not in src:
        # insert after the last existing @/ import, or after the leading comment block
        lines = src.splitlines(keepends=True)
        insert_at = None
        for i, line in enumerate(lines):
            if re.match(r'import\b[^\n]*from\s+"@/', line):
                insert_at = i
        if insert_at is None:
            for i, line in enumerate(lines):
                if line.startswith("import ") or line.startswith('import "'):
                    insert_at = i
        if insert_at is None:
            # place after the leading /* ... */ header comment block
            m = re.match(r"(\s*/\*.*?\*/\s*)", src, re.S)
            if m:
                head, rest = m.group(1), src[m.end():]
                path.write_text(head + IMPORT_LINE + "\n" + rest)
                return True
            lines_text = src.splitlines(keepends=True)
            lines_text.insert(0, IMPORT_LINE + "\n")
            path.write_text("".join(lines_text))
            return True
        # respect multi-line imports: find the end of the import starting at insert_at
        j = insert_at
        while j < len(lines) and not re.search(r'from\s+"@/[^\n]+"\s*;?', lines[j]):
            j += 1
        lines.insert(j + 1, IMPORT_LINE + "\n")
        path.write_text("".join(lines))
        return True

    path.write_text(src)
    return True


def main() -> None:
    changed = []
    for rel in FILES:
        p = ROOT / rel
        if not p.exists():
            print(f"SKIP missing: {rel}")
            continue
        if process(p):
            changed.append(rel)
    print(f"modified {len(changed)} files:")
    for c in changed:
        print("  ", c)
    # report any leftover mode usages
    left = subprocess.run(
        ["rg", "-n", 'mode: "insensitive"', "src/"], capture_output=True, text=True
    )
    if left.stdout.strip():
        print("LEFTOVERS:\n" + left.stdout)
    else:
        print("no leftover mode: \"insensitive\" usages")


if __name__ == "__main__":
    sys.exit(main())
