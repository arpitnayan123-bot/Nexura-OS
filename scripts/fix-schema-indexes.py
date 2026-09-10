#!/usr/bin/env python3
"""Add missing hospitalId indexes to tenant-scoped models + drop dead User/Post scaffold models."""
import re, pathlib

p = pathlib.Path("/home/z/my-project/prisma/schema.prisma")
src = p.read_text()

# 1) Drop the dead scaffold models (zero code references; tables verified empty).
for model in ["User", "Post"]:
    pat = re.compile(rf"\nmodel {model} \{{[^}}]*\}}\n", re.DOTALL)
    src, n = pat.subn("\n", src)
    print(f"drop {model}: {n}")

# 2) Add @@index([hospitalId]) where missing.
TARGETS = [
    "HospitalOrder", "ClinicalNote", "HospitalVital", "HospitalPrescription",
    "HospitalBill", "InsuranceClaim", "NxMessage", "NxPayment", "NxStockTxn",
    "NxImagingReport", "NxUserRoleAssignment", "NxOrderEvent", "NxWebhookDelivery",
    "NxIntegrationEvent", "NxAppointmentEvent", "TourismSetting",
]

def block_span(name: str):
    m = re.search(rf"\nmodel {name} \{{", src)
    if not m:
        return None
    start = m.start()
    end = src.index("\n}", m.end())
    return start, end

added, skipped = [], []
for name in TARGETS:
    span = block_span(name)
    if not span:
        skipped.append(f"{name} (model not found)")
        continue
    s, e = span
    body = src[s:e]
    if "hospitalId" not in body:
        skipped.append(f"{name} (no hospitalId field)")
        continue
    if re.search(r"@@index\(\[hospitalId", body):
        skipped.append(f"{name} (already indexed)")
        continue
    new_body = body + "\n  @@index([hospitalId])"
    src = src[:s] + new_body + src[e:]
    added.append(name)

p.write_text(src)
print(f"added hospitalId index to {len(added)} models: {', '.join(added)}")
print(f"skipped: {', '.join(skipped) if skipped else 'none'}")
