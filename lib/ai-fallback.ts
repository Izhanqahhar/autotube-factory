import { callLLM, getProviderFromModelId } from "@/lib/llm-router";
import { FREE_MODEL_PRIORITY } from "@/lib/models";

export interface FallbackResult {
  text: string;
  modelUsed: string;
  provider: string;
  latencyMs: number;
  attempts: number;
}

/**
 * Tries models in free-first priority order.
 * Returns first successful response + diagnostics.
 */
export async function callWithFallback(
  system: string,
  user: string,
  maxTokens = 4096,
  preferredModel?: string
): Promise<FallbackResult> {
  const chain = preferredModel
    ? [preferredModel, ...FREE_MODEL_PRIORITY.filter((m) => m !== preferredModel)]
    : FREE_MODEL_PRIORITY;

  const errors: string[] = [];
  let attempts = 0;

  for (const modelId of chain) {
    attempts++;
    const start = Date.now();
    try {
      const text = await callLLM(system, user, modelId, maxTokens);
      if (text && text.trim().length > 10) {
        return {
          text,
          modelUsed: modelId,
          provider: getProviderFromModelId(modelId),
          latencyMs: Date.now() - start,
          attempts,
        };
      }
      errors.push(`${modelId}: empty response`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);

      // ── Missing key / auth errors — skip immediately, no point retrying ──
      if (
        msg.includes("not set") ||
        msg.includes("security token") ||
        msg.includes("invalid token") ||
        msg.includes("Unauthorized") ||
        msg.includes("API key not valid") ||
        msg.includes("401")
      ) {
        errors.push(`${modelId}: no key/auth`);
        console.warn(`[Fallback] ${modelId} skipped (auth/key):`, msg.slice(0, 120));
        continue;
      }

      // ── Rate limits — skip this model, try next ──
      if (
        msg.includes("GROQ_RATE_LIMIT") ||
        msg.includes("429") ||
        msg.includes("RESOURCE_EXHAUSTED") ||
        msg.includes("quota") ||
        msg.includes("rate_limit") ||
        msg.includes("rate limit")
      ) {
        errors.push(`${modelId}: rate limited`);
        console.warn(`[Fallback] ${modelId} skipped (rate limited):`, msg.slice(0, 120));
        continue;
      }

      // ── Request too large — skip small models, try bigger ones ──
      if (msg.includes("413") || msg.includes("Request too large") || msg.includes("request_too_large") || msg.includes("context_length_exceeded")) {
        errors.push(`${modelId}: request too large`);
        console.warn(`[Fallback] ${modelId} skipped (too large):`, msg.slice(0, 120));
        continue;
      }

      // ── Model genuinely not found / no endpoints — be very specific ──
      if (
        msg.includes("No endpoints") ||
        msg.includes("model_not_found") ||
        msg.includes("MODEL_NOT_FOUND") ||
        msg.includes("is not supported") ||
        msg.includes("no longer ava") ||
        msg.includes("is not found") ||        // Google: "models/X is not found for API version"
        (msg.includes("404") && (msg.includes("OpenRouter") || msg.includes("Ollama") || msg.includes("Groq error 404") || msg.includes("Cloudflare") || msg.includes("Google AI")))
      ) {
        errors.push(`${modelId}: not found/unavailable`);
        console.warn(`[Fallback] ${modelId} skipped (model unavailable):`, msg.slice(0, 120));
        continue;
      }

      errors.push(`${modelId}: ${msg.slice(0, 80)}`);
      console.warn(`[Fallback] ${modelId} failed:`, msg.slice(0, 120));
    }
  }

  throw new Error(`All models in fallback chain failed:\n${errors.join("\n")}`);
}

export async function callWithFallbackJSON<T>(
  system: string,
  user: string,
  maxTokens = 4096,
  preferredModel?: string
): Promise<{ data: T; modelUsed: string; provider: string; latencyMs: number; attempts: number }> {
  const { text, modelUsed, provider, latencyMs, attempts } = await callWithFallback(
    system, user, maxTokens, preferredModel
  );

  // Import extractJSON from router
  const { extractJSON } = await import("@/lib/llm-router");
  return { data: extractJSON<T>(text), modelUsed, provider, latencyMs, attempts };
}
