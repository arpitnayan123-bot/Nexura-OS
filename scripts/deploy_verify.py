#!/usr/bin/env python3
"""Deploy rehearsal: execute the DEPLOY_WALKTHROUGH.md Step-8 checklist
against a running production instance (localhost:3000 stands in for the
Vercel URL). Exits non-zero on any failed check."""
import json, subprocess, sys, urllib.request, datetime, pathlib

BASE = "http://localhost:3000"
REPO = pathlib.Path("/home/z/my-project")
results = []

# Production sets nx_access with Secure flag (correct for HTTPS) — replay
# it manually since urllib's jar refuses Secure cookies over plain http.
SESSION_COOKIE = {}

def check(name, ok, detail=""):
    results.append((name, ok, detail))
    print(f"{'PASS' if ok else 'FAIL'}  {name}" + (f"  — {detail}" if detail else ""))

def req(path, method="GET", payload=None, timeout=15):
    data = json.dumps(payload).encode() if payload is not None else None
    headers = {"Content-Type": "application/json"} if data else {}
    if SESSION_COOKIE:
        headers["Cookie"] = "; ".join(f"{k}={v}" for k, v in SESSION_COOKIE.items())
    r = urllib.request.Request(BASE + path, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(r, timeout=timeout) as res:
            for h in res.headers.get_all("Set-Cookie") or []:
                if "nx_access=" in h and "maxAge=0" not in h:
                    kv = h.split(";", 1)[0]
                    k, _, v = kv.partition("=")
                    SESSION_COOKIE[k.strip()] = v.strip()
            return res.status, res.read()
    except urllib.error.HTTPError as e:
        return e.code, e.read()

# ── Check 0 · build currency (src/ files vs served BUILD_ID) ─────────
build_id = REPO / ".next" / "standalone" / ".next" / "BUILD_ID"
build_ts = build_id.stat().st_mtime if build_id.exists() else 0
stale = subprocess.run(
    ["find", str(REPO / "src"), str(REPO / "prisma"), "-type", "f",
     "-newer", str(build_id), "-print", "-quit"],
    capture_output=True, text=True).stdout.strip()
build_dt = datetime.datetime.fromtimestamp(build_ts).strftime("%m-%d %H:%M")
check("no src/ drift newer than served BUILD_ID", build_id.exists() and not stale,
      f"build {build_dt}" + (f" · drifted: {stale}" if stale else ""))

# ── Check 1 · /api/health ────────────────────────────────────────────
code, body = req("/api/health")
try:
    h = json.loads(body)
    ok = code == 200 and h.get("status") == "ok"
    detail = json.dumps({k: h[k] for k in list(h)[:3]})[:120]
except Exception:
    ok, detail = False, body[:120].decode(errors="replace")
check("/api/health -> {status:ok}", ok, detail)

# ── Check 2 · homepage linen theme ───────────────────────────────────
code, body = req("/")
html = body.decode(errors="replace")
has_linen = ("linen" in html) and ("Nexura" in html)
check("GET / -> 200 marketing homepage (linen theme)", code == 200 and has_linen,
      f"HTTP {code}, {len(body)//1024} KB")

# ── Check 3 · /hospital console shell renders ────────────────────────
code, body = req("/hospital")
ok = code == 200 and ("hospital" in body.decode(errors="replace").lower())
check("GET /hospital -> 200 console shell", ok, f"HTTP {code}, {len(body)//1024} KB")

# ── Check 4 · demo sign-in DR.RAJESH (PIN fast path) ─────────────────
code, body = req("/api/nx/auth", "POST",
                 {"method": "pin", "staffCode": "DR.RAJESH", "pin": "2468"})
try:
    resp = json.loads(body)
except Exception:
    resp = {}
user = resp.get("user") or {}
modules = resp.get("modules") or []
check("demo sign-in DR.RAJESH / PIN 2468",
      code == 200 and user.get("role") == "doctor" and "nx_access" in SESSION_COOKIE,
      f"POST /api/nx/auth -> {code}, role={user.get('role')}, "
      f"{len(modules)} modules, nx_access {'captured' if 'nx_access' in SESSION_COOKIE else 'MISSING'}")

# ── Check 5 · patient records accessible with session ────────────────
code, body = req("/api/nx/patients?take=5")
try:
    data = json.loads(body)
    n = len(data) if isinstance(data, list) else len(data.get("patients", data.get("data", [])))
except Exception:
    n, data = 0, {}
check("GET /api/nx/patients -> records returned", code == 200 and n > 0,
      f"HTTP {code}, {n} records" if code == 200 else f"HTTP {code}: {body[:100].decode(errors='replace')}")

# ── Check 6 · access already audited (walkthrough promise) ───────────
# RBAC note: the audit module is admin/auditor-only — a doctor session
# correctly gets 403 (role matrix in src/lib/nx/session.ts). Prove the
# trail from the hospital-admin account instead.
code, body = req("/api/nx/audit?take=50")
doctor_403 = (code == 403)
code, body = req("/api/nx/auth", "POST",
                 {"method": "pin", "staffCode": "ADM.SUNIL", "pin": "2468"})
try:
    resp = json.loads(body)
except Exception:
    resp = {}
admin_role = (resp.get("user") or {}).get("role")
trail_ok, detail = False, f"doctor audit {"403 (correct RBAC)" if doctor_403 else "NOT 403"}; admin login HTTP {code}"
if code == 200 and admin_role:
    code, body = req("/api/nx/audit?take=50")
    if code == 200:
        try:
            a = json.loads(body)
            items = a if isinstance(a, list) else (a.get("events") or a.get("entries") or a.get("logs")
                    or a.get("items") or a.get("audit") or [])
            trail_ok = len(items) > 0
            detail += f" · {len(items)} entries · auth.login logged: {'auth.login' in json.dumps(items)}"
        except Exception as e:
            detail += f" · parse: {e}"
    else:
        detail += f" · audit HTTP {code}"
check("access trail present (admin view; doctor correctly 403)", trail_ok, detail)

# ── Check 7 · SSE live alerts wired (walkthrough promise) ────────────
# SSE streams forever — a read timeout AFTER headers open IS the success case.
try:
    code, body = req("/api/nx/stream", timeout=4)
    ok, detail = code == 200, f"HTTP {code}"
except Exception as e:
    ok = isinstance(e, TimeoutError)
    detail = "stream opened and stayed live (read timeout = streaming)" if ok else f"{type(e).__name__}: {e}"
check("GET /api/nx/stream -> SSE opens and streams", ok, detail)

print()
fails = [r for r in results if not r[1]]
print(f"RESULT: {len(results) - len(fails)}/{len(results)} checks passed")
sys.exit(1 if fails else 0)
