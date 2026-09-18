import { NextRequest } from "next/server";
import { ok, withRoute } from "@/lib/nx/api";

/* GET /api/nx/predict/openapi — OpenAPI 3.1 spec for every
   /api/nx/predict/* endpoint. The deliverable API documentation. */
const spec = {
  openapi: "3.1.0",
  info: {
    title: "Nexura PIE — Predictive Intelligence Engine API",
    version: "1.0.0",
    description:
      "Healthcare is Reactive. Nexura Makes it Predictive. Multi-modal ingestion, living digital twin, real-time risk stratification (Time-to-Decay), counterfactual what-if simulation, pre-emptive protocols with human-in-the-loop approval, federated learning and governance. Classified Class II SaMD — supports, never replaces, clinical judgment.",
  },
  paths: {
    "/api/nx/predict/radar": {
      get: {
        summary: "Crisis Radar — patients sorted by Time-to-Decay",
        parameters: [
          { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 200 } },
        ],
        responses: {
          "200": { description: "Radar rows with band, confidence, top driver" },
          "401": { description: "Unauthorized" },
        },
      },
    },
    "/api/nx/predict/risk/{patientId}": {
      get: {
        summary: "Run a full PIE cycle for one patient",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          "200": { description: "Composite + per-domain assessments, drivers, protocol decision" },
          "404": { description: "Patient not found" },
        },
      },
    },
    "/api/nx/predict/twin/{patientId}": {
      get: {
        summary: "Living Twin state vector + physics baseline + intervention catalog",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "State vector, hemodynamic baseline, catalog" } },
      },
      post: {
        summary: "Counterfactual what-if simulation",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["interventionIds"],
                properties: {
                  interventionIds: { type: "array", items: { type: "string" }, maxItems: 4 },
                },
              },
            },
          },
        },
        responses: { "200": { description: "Projected outcomes with deltas and caveats" } },
      },
    },
    "/api/nx/predict/lifestream/{patientId}": {
      get: {
        summary: "Unified Patient Life Stream (30-day window)",
        parameters: [{ name: "patientId", in: "path", required: true, schema: { type: "string" } }],
        responses: { "200": { description: "Chronological multi-modal stream" } },
      },
    },
    "/api/nx/predict/protocols": {
      get: {
        summary: "Protocol approval queue",
        responses: { "200": { description: "Protocols with parsed actions + patient labels" } },
      },
    },
    "/api/nx/predict/protocols/{id}": {
      post: {
        summary: "Approve or Reject a protocol (human-in-the-loop)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["action"],
                properties: {
                  action: { type: "string", enum: ["approve", "reject"] },
                  reason: { type: "string" },
                  approvedBy: { type: "string" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Decision recorded; approval creates WorkQueue tasks" },
          "409": { description: "Protocol not actionable" },
        },
      },
    },
    "/api/nx/bio/{deviceId}": {
      post: {
        summary: "BioSignalIngestionEngine — wearable JSON stream ingestion",
        parameters: [{ name: "deviceId", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["samples"],
                properties: {
                  patientId: { type: "string" },
                  samples: {
                    type: "array",
                    items: {
                      type: "object",
                      required: ["metric", "value"],
                      properties: {
                        metric: { type: "string" },
                        value: { type: "number" },
                        unit: { type: "string" },
                        quality: { type: "number" },
                        capturedAt: { type: "string", format: "date-time" },
                      },
                    },
                    maxItems: 500,
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Ingest report: accepted/rejected per metric" },
          "404": { description: "Unknown device" },
        },
      },
    },
    "/api/nx/predict/explain/{assessmentId}": {
      get: {
        summary: "The Why button — SHAP-style explanation",
        parameters: [
          { name: "assessmentId", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Headline, top factors, protective factors, data quality" },
        },
      },
    },
    "/api/nx/predict/federation": {
      get: {
        summary: "Federated learning status",
        responses: { "200": { description: "Pending deltas + recent aggregations" } },
      },
      post: {
        summary: "Submit tenant weight delta (deltas only — privacy sanitized)",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["tenantId", "modelId", "versionBase", "weights", "samples"],
                properties: {
                  tenantId: { type: "string" },
                  modelId: {
                    type: "string",
                    enum: ["sepsis_early_warning", "readmission_trajectory", "chronic_organ_decay"],
                  },
                  versionBase: { type: "string" },
                  weights: { type: "object", additionalProperties: { type: "number" } },
                  samples: { type: "integer" },
                  loss: { type: "number" },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Accepted; aggregates when ≥2 tenants pending" },
          "422": { description: "Privacy validation rejected the delta" },
        },
      },
    },
    "/api/nx/predict/governance": {
      get: {
        summary: "SaMD registry + bias audits + fail-safe posture",
        responses: { "200": { description: "Governance surface" } },
      },
    },
  },
  components: {
    securitySchemes: { sessionCookie: { type: "apiKey", in: "cookie", name: "nx_session" } },
  },
  security: [{ sessionCookie: [] }],
};

export const GET = withRoute("pie.openapi", async () => ok(spec));
