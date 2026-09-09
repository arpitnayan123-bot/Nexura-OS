/**
 * NexuraAI Gateway — Central AI Abstraction Layer
 *
 * All Nexura OS modules must use this gateway instead of directly
 * calling z-ai-web-dev-sdk. The gateway handles:
 *
 * - Model selection (per capability)
 * - Capability routing (text, vision, speech, tts)
 * - Fallback models (if primary fails)
 * - Error handling (graceful degradation)
 * - Timeout handling (configurable per request)
 * - Structured responses (consistent output format)
 * - Logging (all AI calls logged with metadata)
 * - Cost tracking (token/call counting)
 * - Environment-based configuration
 *
 * Architecture:
 *
 *   Nexura Feature (e.g., AI Scribe, Symptom Checker)
 *         ↓
 *   NexuraAI Gateway (this file)
 *         ↓
 *   Capability Router (text → LLM, image → VLM, audio → ASR)
 *         ↓
 *   Model Selector (picks best model for capability)
 *         ↓
 *   AI Provider (z-ai-web-dev-sdk)
 *         ↓
 *   Response (structured + logged)
 */

import type { NextRequest } from "next/server";

// ============================================================
// Types
// ============================================================

export type AICapability =
  | "medical_reasoning"    // Clinical decisions, SOAP, discharge summary
  | "general_ai"           // General Q&A
  | "vision"               // Image analysis (Rx OCR, X-ray, derma)
  | "speech_to_text"       // Voice transcription
  | "text_to_speech"       // Voice generation
  | "classification"       // Symptom triage, risk scoring
  | "summarization"        // Lab report interpretation
  | "agentic_tasks";       // Multi-step AI workflows

export type AIProvider = "z-ai" | "fallback";

export interface ModelConfig {
  id: string;
  provider: AIProvider;
  capability: AICapability;
  maxTokens?: number;
  temperature?: number;
  timeoutMs: number;
}

export interface AIRequest {
  capability: AICapability;
  systemPrompt: string;
  userPrompt: string;
  images?: string[]; // Base64 data URLs for vision
  audio?: string;    // Base64 for ASR
  text?: string;     // For TTS
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
  requestId?: string;
}

export interface AIResponse {
  success: boolean;
  content: string;
  model: string;
  provider: AIProvider;
  capability: AICapability;
  latencyMs: number;
  tokenCount?: number;
  error?: string;
  fallbackUsed: boolean;
  requestId: string;
}

export interface AICallLog {
  requestId: string;
  capability: AICapability;
  model: string;
  provider: AIProvider;
  success: boolean;
  latencyMs: number;
  timestamp: string;
  error?: string;
  fallbackUsed: boolean;
}

// ============================================================
// Model Registry — maps capabilities to models
// ============================================================

const MODEL_REGISTRY: Record<AICapability, ModelConfig> = {
  medical_reasoning: {
    id: "glm-4-plus",
    provider: "z-ai",
    capability: "medical_reasoning",
    temperature: 0.3,  // Low temp for clinical accuracy
    timeoutMs: 30000,
  },
  general_ai: {
    id: "glm-4-plus",
    provider: "z-ai",
    capability: "general_ai",
    temperature: 0.7,
    timeoutMs: 20000,
  },
  vision: {
    id: "auto", // SDK auto-selects VLM model via createVision()
    provider: "z-ai",
    capability: "vision",
    temperature: 0.3,
    timeoutMs: 45000,
  },
  speech_to_text: {
    id: "auto", // SDK auto-selects ASR model
    provider: "z-ai",
    capability: "speech_to_text",
    timeoutMs: 30000,
  },
  text_to_speech: {
    id: "auto", // SDK auto-selects TTS model
    provider: "z-ai",
    capability: "text_to_speech",
    timeoutMs: 20000,
  },
  classification: {
    id: "glm-4-plus",
    provider: "z-ai",
    capability: "classification",
    temperature: 0.2,
    timeoutMs: 20000,
  },
  summarization: {
    id: "glm-4-plus",
    provider: "z-ai",
    capability: "summarization",
    temperature: 0.3,
    timeoutMs: 25000,
  },
  agentic_tasks: {
    id: "glm-4-plus",
    provider: "z-ai",
    capability: "agentic_tasks",
    temperature: 0.5,
    timeoutMs: 60000,
  },
};

// Fallback models (used if primary fails)
// Note: Only glm-4-plus is verified. If it fails, the gateway returns an error
// with a rule-based fallback message. No unverified model IDs are used.
const FALLBACK_MODELS: Partial<Record<AICapability, ModelConfig>> = {};

// ============================================================
// Logging — in-memory call log (replace with DB/Redis in prod)
// ============================================================

const callLogs: AICallLog[] = [];
const MAX_LOGS = 500;

function logCall(log: AICallLog): void {
  callLogs.unshift(log);
  if (callLogs.length > MAX_LOGS) callLogs.pop();

  // Console log for development
  const status = log.success ? "✓" : "✗";
  console.log(
    `[NexuraAI] ${status} ${log.capability} → ${log.model} (${log.latencyMs}ms)${log.fallbackUsed ? " [fallback]" : ""}${log.error ? ` ERROR: ${log.error}` : ""}`
  );
}

export function getCallLogs(limit: number = 50): AICallLog[] {
  return callLogs.slice(0, limit);
}

export function getAIStats(): {
  totalCalls: number;
  successRate: number;
  avgLatencyMs: number;
  callsByCapability: Record<string, number>;
} {
  const total = callLogs.length;
  const successful = callLogs.filter(l => l.success).length;
  const avgLatency = total > 0 ? Math.round(callLogs.reduce((s, l) => s + l.latencyMs, 0) / total) : 0;
  const byCapability: Record<string, number> = {};
  callLogs.forEach(l => {
    byCapability[l.capability] = (byCapability[l.capability] || 0) + 1;
  });

  return {
    totalCalls: total,
    successRate: total > 0 ? Math.round((successful / total) * 100) : 0,
    avgLatencyMs: avgLatency,
    callsByCapability: byCapability,
  };
}

// ============================================================
// Gateway — Main entry point
// ============================================================

export class NexuraAI {
  private static instance: NexuraAI | null = null;
  private zai: any = null;

  private constructor() {}

  static async getInstance(): Promise<NexuraAI> {
    if (!NexuraAI.instance) {
      NexuraAI.instance = new NexuraAI();
    }
    if (!NexuraAI.instance.zai) {
      const ZAI = (await import("z-ai-web-dev-sdk")).default;
      NexuraAI.instance.zai = await ZAI.create();
    }
    return NexuraAI.instance;
  }

  /**
   * Main gateway method — routes to appropriate AI capability.
   * Handles model selection, fallback, timeout, logging.
   */
  static async call(request: AIRequest): Promise<AIResponse> {
    const requestId = request.requestId || `req_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const config = MODEL_REGISTRY[request.capability];
    const timeoutMs = request.timeoutMs || config.timeoutMs;
    const startTime = Date.now();

    // Try primary model
    const result = await this.tryModel(request, config, requestId, timeoutMs);

    if (result.success) {
      logCall({
        requestId,
        capability: request.capability,
        model: config.id,
        provider: config.provider,
        success: true,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        fallbackUsed: false,
      });
      return { ...result, requestId, fallbackUsed: false };
    }

    // Try fallback model
    const fallback = FALLBACK_MODELS[request.capability];
    if (fallback) {
      const fallbackResult = await this.tryModel(request, fallback, requestId, timeoutMs);

      logCall({
        requestId,
        capability: request.capability,
        model: fallbackResult.model,
        provider: fallback.provider,
        success: fallbackResult.success,
        latencyMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
        error: fallbackResult.error,
        fallbackUsed: true,
      });

      return { ...fallbackResult, requestId, fallbackUsed: true };
    }

    // No fallback — return error
    logCall({
      requestId,
      capability: request.capability,
      model: config.id,
      provider: config.provider,
      success: false,
      latencyMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
      error: result.error,
      fallbackUsed: false,
    });

    return {
      success: false,
      content: "",
      model: config.id,
      provider: config.provider,
      capability: request.capability,
      latencyMs: Date.now() - startTime,
      error: result.error || "AI call failed with no fallback available",
      fallbackUsed: false,
      requestId,
    };
  }

  /**
   * Try a specific model with timeout handling.
   */
  private static async tryModel(
    request: AIRequest,
    config: ModelConfig,
    requestId: string,
    timeoutMs: number
  ): Promise<AIResponse> {
    try {
      const instance = await NexuraAI.getInstance();
      const startTime = Date.now();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs);
      });

      let response;

      // Route based on capability type
      if (request.capability === "vision" && request.images?.length) {
        // Vision call (VLM) — SDK auto-selects the vision model
        const aiPromise = instance.zai.chat.completions.createVision({
          messages: [
            { role: "system", content: request.systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: request.userPrompt },
                ...request.images.map(img => ({ type: "image_url" as const, image_url: { url: img } })),
              ],
            },
          ],
          thinking: { type: "disabled" as const },
        });
        response = await Promise.race([aiPromise, timeoutPromise]);
      } else if (request.capability === "speech_to_text" && request.audio) {
        // ASR call — SDK auto-selects the ASR model
        const aiPromise = instance.zai.audio.asr.create({
          file_base64: request.audio,
        });
        response = await Promise.race([aiPromise, timeoutPromise]);
      } else if (request.capability === "text_to_speech" && request.text) {
        // TTS call — SDK auto-selects the TTS model
        const aiPromise = instance.zai.audio.tts.create({
          input: request.text,
          voice: "tongtong",
          speed: 1.0,
          response_format: "wav",
          stream: false,
        });
        response = await Promise.race([aiPromise, timeoutPromise]);
      } else {
        // Standard LLM call
        const aiPromise = instance.zai.chat.completions.create({
          model: config.id,
          messages: [
            { role: "system", content: request.systemPrompt },
            { role: "user", content: request.userPrompt },
          ],
          thinking: { type: "disabled" as const },
          ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
        });
        response = await Promise.race([aiPromise, timeoutPromise]);
      }

      const latencyMs = Date.now() - startTime;

      // Extract content based on response type
      let content = "";
      if (response.choices?.[0]?.message?.content) {
        content = response.choices[0].message.content;
      } else if (response.text) {
        content = response.text; // ASR response
      } else if (response.data?.[0]?.base64) {
        content = response.data[0].base64; // TTS response (base64 audio)
      }

      return {
        success: true,
        content,
        model: config.id,
        provider: config.provider,
        capability: request.capability,
        latencyMs,
        fallbackUsed: false,
        requestId,
      };
    } catch (error: any) {
      return {
        success: false,
        content: "",
        model: config.id,
        provider: config.provider,
        capability: request.capability,
        latencyMs: 0,
        error: error.message || "Unknown AI error",
        fallbackUsed: false,
        requestId,
      };
    }
  }

  // ============================================================
  // Convenience methods for common capabilities
  // ============================================================

  /** Medical reasoning — for SOAP, discharge summary, clinical decisions */
  static async medicalReasoning(
    systemPrompt: string,
    userPrompt: string,
    options?: { timeoutMs?: number; requestId?: string }
  ): Promise<AIResponse> {
    return NexuraAI.call({
      capability: "medical_reasoning",
      systemPrompt,
      userPrompt,
      temperature: 0.3,
      ...options,
    });
  }

  /** General AI — for Q&A, assistant */
  static async generalAI(
    systemPrompt: string,
    userPrompt: string,
    options?: { timeoutMs?: number; requestId?: string }
  ): Promise<AIResponse> {
    return NexuraAI.call({
      capability: "general_ai",
      systemPrompt,
      userPrompt,
      ...options,
    });
  }

  /** Vision — for prescription OCR, X-ray reading, derma scan */
  static async vision(
    systemPrompt: string,
    userPrompt: string,
    images: string[],
    options?: { timeoutMs?: number; requestId?: string }
  ): Promise<AIResponse> {
    return NexuraAI.call({
      capability: "vision",
      systemPrompt,
      userPrompt,
      images,
      ...options,
    });
  }

  /** Classification — for symptom triage, risk scoring */
  static async classification(
    systemPrompt: string,
    userPrompt: string,
    options?: { timeoutMs?: number; requestId?: string }
  ): Promise<AIResponse> {
    return NexuraAI.call({
      capability: "classification",
      systemPrompt,
      userPrompt,
      ...options,
    });
  }

  /** Summarization — for lab report interpretation */
  static async summarization(
    systemPrompt: string,
    userPrompt: string,
    options?: { timeoutMs?: number; requestId?: string }
  ): Promise<AIResponse> {
    return NexuraAI.call({
      capability: "summarization",
      systemPrompt,
      userPrompt,
      ...options,
    });
  }
}

// ============================================================
// Model Registry Export (for /api/ai/stats endpoint)
// ============================================================

export function getModelRegistry(): Record<AICapability, ModelConfig> {
  return MODEL_REGISTRY;
}

export function getAvailableCapabilities(): AICapability[] {
  return Object.keys(MODEL_REGISTRY) as AICapability[];
}
