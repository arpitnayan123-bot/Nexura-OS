# Nexura OS — API Documentation

## Base URL

- Development: `http://localhost:3000/api`
- Production: `https://your-domain.vercel.app/api`

## Authentication

All protected routes require a JWT token in cookies (`nexura_access`) or as a Bearer token:

```
Authorization: Bearer <token>
```

### Auth Endpoints

| Method | Endpoint    | Description                                        | Auth   |
| ------ | ----------- | -------------------------------------------------- | ------ |
| POST   | `/api/auth` | Send OTP (`{action: "send_otp", phone: "+91..."}`) | No     |
| POST   | `/api/auth` | Verify OTP (`{action: "verify_otp", phone, otp}`)  | No     |
| GET    | `/api/auth` | Get current user                                   | Cookie |
| POST   | `/api/auth` | Logout (`{action: "logout"}`)                      | Cookie |
| DELETE | `/api/auth` | Logout                                             | Cookie |

## Hospital OS APIs

| Method | Endpoint                     | Description                                     |
| ------ | ---------------------------- | ----------------------------------------------- |
| GET    | `/api/hospital/dashboard`    | KPIs, bed status, revenue trend, ward occupancy |
| GET    | `/api/hospital/opd`          | Today's appointments + vitals + notes           |
| PATCH  | `/api/hospital/opd`          | Update appointment status                       |
| GET    | `/api/hospital/ipd`          | Active admissions with vitals + orders          |
| POST   | `/api/hospital/ipd`          | Admit patient (ER handoff)                      |
| GET    | `/api/hospital/beds`         | Ward-grouped bed map                            |
| GET    | `/api/hospital/ot`           | OT schedule by room                             |
| GET    | `/api/hospital/nursing`      | ICU/HDU patients by NEWS2                       |
| POST   | `/api/hospital/nursing`      | Save vitals (auto NEWS2)                        |
| GET    | `/api/hospital/lab`          | Lab orders by status                            |
| GET    | `/api/hospital/billing`      | Invoices + summary                              |
| GET    | `/api/hospital/insurance`    | TPA claims                                      |
| GET    | `/api/hospital/staff`        | Staff + departments                             |
| GET    | `/api/hospital/ehr?q=`       | Patient search                                  |
| GET    | `/api/hospital/ehr?id=`      | Full patient EHR                                |
| POST   | `/api/hospital/ai-command`   | AI clinical assistant (GLM-4-Plus)              |
| POST   | `/api/hospital/ai-scribe`    | AI Medical Scribe (voice → SOAP + Rx + Billing) |
| POST   | `/api/hospital/ai-discharge` | AI Discharge Summary generator                  |

## Clinic OS APIs

| Method   | Endpoint                   | Description                        |
| -------- | -------------------------- | ---------------------------------- |
| GET      | `/api/clinic/dashboard`    | Today's queue, KPIs, revenue       |
| GET      | `/api/clinic/patients`     | Patient list with search           |
| GET      | `/api/clinic/appointments` | Today's appointments               |
| POST     | `/api/clinic/visit`        | Save SOAP visit + auto-invoice     |
| GET      | `/api/clinic/billing`      | Invoices                           |
| GET      | `/api/clinic/drugs?q=`     | Drug autocomplete (54 Indian meds) |
| POST     | `/api/clinic/abha`         | ABHA ID lookup                     |
| GET/POST | `/api/clinic/booking`      | Public booking page                |

## Pharmacy APIs

| Method   | Endpoint                           | Description                |
| -------- | ---------------------------------- | -------------------------- |
| GET      | `/api/pharmacy/inventory`          | Stock + batches (FEFO)     |
| GET/POST | `/api/pharmacy/billing`            | Sales + create sale        |
| POST     | `/api/pharmacy/voice-bill`         | Voice → cart (ASR + LLM)   |
| POST     | `/api/pharmacy/prescription-ocr`   | Rx image → medicines (VLM) |
| GET      | `/api/pharmacy/predict`            | Demand forecast + reorder  |
| GET/POST | `/api/pharmacy/schedule-h`         | Schedule H register        |
| GET/POST | `/api/pharmacy/day-closing`        | Day summary                |
| GET/POST | `/api/pharmacy/purchases`          | Purchase orders            |
| GET/POST | `/api/pharmacy/suppliers`          | Supplier ledger            |
| GET/POST | `/api/pharmacy/customers-accounts` | Customer credit            |
| GET/POST | `/api/pharmacy/returns`            | Near-expiry returns        |
| GET      | `/api/pharmacy/e-invoice`          | GST e-invoice JSON         |

## Patient Portal APIs

| Method   | Endpoint                     | Description                  | Auth   |
| -------- | ---------------------------- | ---------------------------- | ------ |
| GET      | `/api/portal/auth`           | Current user                 | Cookie |
| GET      | `/api/portal/dashboard`      | Unified health data          | ✅     |
| GET/POST | `/api/portal/blood-bookings` | Blood test bookings          | ✅     |
| POST     | `/api/portal/ai-interpret`   | AI lab report interpretation | ✅     |
| GET/POST | `/api/portal/family`         | Family members               | ✅     |

## Connect APIs

| Method         | Endpoint                     | Description                |
| -------------- | ---------------------------- | -------------------------- |
| GET/POST       | `/api/connect/connections`   | Doctor-patient connections |
| GET/POST       | `/api/connect/messages`      | Chat messages              |
| PATCH          | `/api/connect/messages/read` | Mark as read               |
| GET/POST/PATCH | `/api/connect/calls`         | Voice/video calls          |
| GET/POST/PATCH | `/api/connect/queue`         | Waiting queue              |

## Know Your Health APIs (15 AI Tools)

All POST, all use z-ai-web-dev-sdk:

| Endpoint                                 | AI Type | Description             |
| ---------------------------------------- | ------- | ----------------------- |
| `/api/know-your-health/symptoms-checker` | LLM     | AI symptom triage       |
| `/api/know-your-health/derma-scan`       | VLM     | Skin condition analysis |
| `/api/know-your-health/xray-reader`      | VLM     | X-ray interpretation    |
| `/api/know-your-health/lab-analyzer`     | VLM     | Lab report reading      |
| `/api/know-your-health/diet-planner`     | LLM     | Nutrition planning      |
| `/api/know-your-health/mental-wellness`  | LLM     | AI counselor            |
| `/api/know-your-health/bp-analyzer`      | LLM     | BP trend analysis       |
| `/api/know-your-health/diabetes-care`    | LLM     | Diabetes management     |
| `/api/know-your-health/womens-care`      | LLM     | Women's health          |
| `/api/know-your-health/ayurveda`         | LLM     | Ayurvedic guidance      |
| `/api/know-your-health/med-interaction`  | LLM     | Drug interactions       |
| `/api/know-your-health/disease-risk`     | LLM     | Risk assessment         |
| `/api/know-your-health/sleep-quality`    | LLM     | Sleep analysis          |
| `/api/know-your-health/food-scan`        | VLM     | Food calorie AI         |
| `/api/know-your-health/health-quiz`      | LLM     | Health literacy quiz    |

## System APIs

| Method | Endpoint      | Description                                    |
| ------ | ------------- | ---------------------------------------------- |
| GET    | `/api/health` | System health check (DB + AI status + latency) |

## Response Format

All APIs return JSON. Standard response:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message"
}
```

Error response:

```json
{
  "error": "error_code",
  "message": "Human-readable error message"
}
```

## Rate Limiting

- 100 requests per 15 minutes per IP
- Returns `429` with `X-RateLimit-Remaining` header
- OTP endpoints: 3 requests per 5 minutes per phone

## Security Headers

All API responses include:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'...`
- `Strict-Transport-Security` (production only)
