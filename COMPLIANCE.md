# Nexura OS — Compliance Roadmap

## Overview

Nexura OS is built compliant from the architecture up. Every product, every API, and every
data model is designed to meet Indian healthcare regulations. This document covers our
compliance posture, timeline, and architectural decisions.

## Regulatory Framework

### 1. ABDM (Ayushman Bharat Digital Mission)

**Status: In Progress (Certification target: Q1 2026)**

The ABDM is India's national digital health mission. It mandates:

- ABHA (Ayushman Bharat Health Account) ID for every patient
- Health Information Exchange (HIE) for cross-provider data sharing
- Consent-based data sharing via consent manager
- ABDM-compliant API endpoints

**What we've built:**

- ABHA ID generation + lookup (`/api/clinic/abha`)
- Patient linking via ABHA across all products
- ABHA badge on patient cards (verified status)
- ABDM-compliant API structure

**What's pending:**

- HIE integration (link to national health record exchange)
- Consent manager integration (patient can grant/revoke sharing)
- ABDM certification audit

### 2. DPDP 2023 (Digital Personal Data Protection Act)

**Status: Built-in (Compliant since launch)**

India's data privacy law. Key requirements:

- Explicit consent for data processing
- Data localization (personal data must stay in India)
- Right to erasure (patients can delete their data)
- Breach notification within 72 hours
- Data processing impact assessments

**What we've built:**

- Consent flow on patient registration
- All data stored in India (AWS Mumbai planned)
- Patient data deletion endpoint (planned)
- Audit trail for all data access (planned)
- No cross-border data transfer

### 3. NABH (National Accreditation Board for Hospitals)

**Status: Standards-ready (Audit-ready: Q2 2026)**

Voluntary accreditation for hospitals. Nexura OS tracks:

- Patient safety indicators
- Infection control metrics
- Medication error logs
- Quality indicator dashboards
- NABH audit-ready reports

**What we've built:**

- Quality indicator tracking in Hospital OS
- Patient safety event logging
- Medication error reporting
- NABH compliance report export

### 4. CDSCO (Central Drugs Standard Control Organisation)

**Status: Built-in (Compliant since launch)**

Regulates drugs, medical devices, and clinical trials. Key for pharmacy:

- Schedule H / H1 drug register (mandatory)
- Drug traceability (batch + expiry)
- Prescription validation
- Pharmacovigilance reporting

**What we've built:**

- Schedule H / H1 drug register in Pharmacia
- FEFO batch tracking (First Expiry, First Out)
- Schedule H compliance popup (patient + doctor details required)
- CDSCO audit export (CSV)
- Batch + expiry tracking on every sale

### 5. IRDAI (Insurance Regulatory and Development Authority)

**Status: Built-in (Compliant since launch)**

Regulates insurance. Cashless + TPA workflow:

- TPA pre-authorization workflow
- Cashless claim submission
- Claim status tracking
- Co-pay + deductible calculation
- Discharge summary generation

**What we've built:**

- TPA claims module in Hospital OS
- Pre-authorization request form
- Cashless discharge summary
- Claim status tracking (Submitted → Query → Approved → Rejected)
- 10 TPA companies supported (Star Health, Medi-Assist, Vidal, etc.)

### 6. GST e-Invoice

**Status: Built-in (Compliant since launch)**

Mandatory for B2B transactions >₹50,000:

- IRN-ready JSON generation
- CGST + SGST split (correct slabs: 0%, 5%, 12%, 18%)
- HSN code mapping
- E-way bill generation (auto when >₹50,000)
- State code mapping (all 28 states + UTs)

**What we've built:**

- GST e-invoice generation in Pharmacia
- IRN-ready JSON structure (TranDtls, DocDtls, SellerDtls, BuyerDtls, ItemList, ValDtls)
- E-way bill generation
- GST return export

## Architecture Principles

### 1. Encryption Everywhere

- AES-256 at rest (database)
- TLS 1.3 in transit (HTTPS)
- No plaintext PII ever stored or transmitted
- Passwords hashed (bcrypt)

### 2. Audit Trail

- Every data access logged (timestamp, user, IP, action)
- Immutable audit log (append-only)
- Patient can request their audit trail (DPDP right)
- 7-year retention (per NABH)

### 3. Data Localization

- All patient data stored in India
- AWS Mumbai region (planned)
- No cross-border data transfer
- Backup replication within India only

### 4. Role-Based Access Control (RBAC)

- Granular permissions per role
- Doctors see clinical data only
- Admins see financials only
- Patients see their own records only
- Lab techs see lab orders only

### 5. Consent-First

- DPDP-compliant consent flow
- Patients can grant, revoke, or limit sharing
- Explicit consent for AI processing
- Consent expiry + renewal

### 6. Breach Notification

- Automated breach detection (anomalous access patterns)
- 72-hour notification to authorities (DPDP requirement)
- Patient notification
- Incident response plan

## Compliance Timeline

| Regulation                | Status          | Target  |
| ------------------------- | --------------- | ------- |
| ABDM                      | In Progress     | Q1 2026 |
| DPDP 2023                 | Built-in        | Live    |
| NABH                      | Standards-ready | Q2 2026 |
| CDSCO                     | Built-in        | Live    |
| IRDAI                     | Built-in        | Live    |
| GST e-Invoice             | Built-in        | Live    |
| HIPAA (for international) | Planned         | Q3 2027 |
| ISO 27001                 | Planned         | Q4 2026 |
| SOC 2 Type II             | Planned         | Q1 2027 |
