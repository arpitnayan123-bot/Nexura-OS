#!/usr/bin/env python3
"""Defensive schema corruption fixer — repairs [h-eaten fragments in schema.prisma."""
import re, sys

p = 'prisma/schema.prisma'
s = open(p).read()
orig = s

# Fix any "ospitalId" that lost its "h[" prefix (variants: fields: ospitalId], [ospitalId], (ospitalId, @@index(ospitalId))
s = re.sub(r'fields:\s*ospitalId\]', 'fields: [hospitalId]', s)
s = re.sub(r'\[ospitalId\]', '[hospitalId]', s)
s = re.sub(r'\(ospitalId,', '(hospitalId,', s)
s = re.sub(r'\(ospitalId\)', '(hospitalId)', s)
# same for "ospital " → "hospital " (model names)
s = re.sub(r'@relation\(fields: \[hospitalId\], references: \[id\], onDelete: Cascade\)', '@relation(fields: [hospitalId], references: [id], onDelete: Cascade)', s)

# Ensure MAR model has patient relation
if 'model NxMedicationAdministration' in s and 'patient       HospitalPatient @relation(fields: [patientId], references: [id], onDelete: Cascade)' not in s:
    s = s.replace("""  controlled    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  hospital      Hospital  @relation(fields: [hospitalId], references: [id], onDelete: Cascade)

  @@index([patientId, scheduledAt])""", """  controlled    Boolean   @default(false)
  createdAt     DateTime  @default(now())
  hospital      Hospital  @relation(fields: [hospitalId], references: [id], onDelete: Cascade)
  patient       HospitalPatient @relation(fields: [patientId], references: [id], onDelete: Cascade)

  @@index([patientId, scheduledAt])""")

open(p, 'w').write(s)
fixed = orig != s
print(f"fixer ran, changed: {fixed}, bad fragments left: {len(re.findall(r'ospitalId\\]', s)) - len(re.findall(r'hospitalId\\]', s))}")
sys.exit(0)
