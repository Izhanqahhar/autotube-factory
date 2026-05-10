import { callBedrock } from "@/lib/bedrock";

// ─── Robust JSON extractor ────────────────────────────────────────────────────

export function extractJSON<T>(text: string): T {
  if (!text || text.trim() === "") throw new Error("Empty response from LLM");

  // Try 1: Direct parse
  try { return JSON.parse(text.trim()) as T; } catch {}

  // Try 2: ```json ... ``` fenced block
  const fence = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (fence?.[1]) { try { return JSON.parse(fence[1].trim()) as T; } catch {} }

  // Try 3: First JSON array
  const arr = text.match(/\[[\s\S]*\]/);
  if (arr) { try { return JSON.parse(arr[0]) as T; } catch {} }

  // Try 4: First JSON object
  const obj = text.match(/\{[\s\S]*\}/);
  if (obj) { try { return JSON.parse(obj[0]) as T; } catch {} }

  // Try 5: Fix truncated JSON — strip leading/trailing garbage
  let cleaned = text.replace(/^[^[{]*/, "").replace(/[^}\]]*$/, "");
  if (cleaned.endsWith(",")) cleaned = cleaned.slice(0, -1);
  const opens = (cleaned.match(/\[/g) ?? []).length;
  const closes = (cleaned.match(/\]/g) ?? []).length;
  if (opens > closes) cleaned += "]".repeat(opens - closes);
  const objOpens = (cleaned.match(/\{/g) ?? []).length;
  const objCloses = (cleaned.match(/\}/g) ?? []).length;
  if (objOpens > objCloses) cleaned += "}".repeat(objOpens - objCloses);
  try { return JSON.parse(cleaned) as T; } catch {}

  console.error("[LLM] Failed to extract JSON from:", text.substring(0, 400));
  throw new Error(`Could not parse LLM response as JSON. Preview: ${text.slice(0, 150)}`);
}

// ─── Ollama ───────────────────────────────────────────────────────────────────

async function callOllama(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const localModel = modelId.replace("ollama/", "");
  const res = await fetch(`${ollamaUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: localModel,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      stream: false,
      options: { num_predict: maxTokens },
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Ollama model "${localModel}" not found. Run: ollama pull ${localModel}`);
    throw new Error(`Ollama error: ${res.status}. Is Ollama running? Run: ollama serve`);
  }
  const data = await res.json();
  return data.message?.content ?? "";
}

// ─── LM Studio (OpenAI compatible) ───────────────────────────────────────────

async function callLMStudio(system: string, user: string, maxTokens: number): Promise<string> {
  const url = process.env.LMSTUDIO_URL ?? process.env.LM_STUDIO_URL ?? "http://localhost:1234";
  const res = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.7,
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) throw new Error(`LM Studio not running at ${url}. Start LM Studio and load a model.`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Groq ─────────────────────────────────────────────────────────────────────

async function callGroq(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set — free at console.groq.com");
  const groqModel = modelId.replace("groq/", "");
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: groqModel,
      max_tokens: maxTokens,
      temperature: 0.7,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (res.status === 429) {
    const retryAfter = res.headers.get("retry-after") ?? "60";
    throw new Error(`GROQ_RATE_LIMIT:${retryAfter} — try again in ${retryAfter}s or switch model`);
  }
  if (!res.ok) throw new Error(`Groq error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Google AI (Gemini) ───────────────────────────────────────────────────────

async function callGoogle(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) throw new Error("GOOGLE_AI_KEY not set — free at aistudio.google.com");
  const googleModel = modelId.replace("google/", "");
  // v1beta endpoint; Google REST API uses camelCase JSON (proto3 JSON mapping)
  // systemInstruction = camelCase (NOT system_instruction)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${googleModel}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: user }] }],
      generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`Google AI error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

// ─── OpenRouter ───────────────────────────────────────────────────────────────

async function callOpenRouter(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY not set — free at openrouter.ai");
  const orModel = modelId.replace("openrouter/", "");
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001",
      "X-Title": "AutoTube Factory",
    },
    body: JSON.stringify({
      model: orModel,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) throw new Error(`OpenRouter error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  if (data.error) throw new Error(`OpenRouter: ${data.error.message ?? JSON.stringify(data.error)}`);
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── HuggingFace Inference ────────────────────────────────────────────────────

async function callHuggingFace(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not set — free at huggingface.co");
  const hfModel = modelId.replace("huggingface/", "");
  const res = await fetch(`https://api-inference.huggingface.co/models/${hfModel}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: hfModel,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 503) throw new Error("HuggingFace model loading (cold start ~20s). Retry shortly.");
  if (!res.ok) throw new Error(`HuggingFace error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Perplexity ───────────────────────────────────────────────────────────────

async function callPerplexity(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) throw new Error("PERPLEXITY_API_KEY not set — get one at perplexity.ai/api");
  const pxModel = modelId.replace("perplexity/", "");
  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: pxModel,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (res.status === 429) throw new Error(`Perplexity rate limited — try again shortly`);
  if (!res.ok) throw new Error(`Perplexity error ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

// ─── Cloudflare Workers AI ────────────────────────────────────────────────────

async function callCloudflare(modelId: string, system: string, user: string, maxTokens: number): Promise<string> {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  // Support both naming variants
  const apiKey = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_AI_KEY;
  if (!accountId || !apiKey) throw new Error("CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN not set — free at cloudflare.com");
  const cfModel = modelId.replace("cloudflare/", "");
  const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${cfModel}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!res.ok) throw new Error(`Cloudflare AI error ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return data.result?.response ?? "";
}

// ─── Provider helper ─────────────────────────────────────────────────────────

export function getProviderFromModelId(modelId: string): string {
  if (modelId.startsWith("groq/")) return "groq";
  if (modelId.startsWith("google/")) return "google";
  if (modelId.startsWith("ollama/")) return "ollama";
  if (modelId.startsWith("openrouter/")) return "openrouter";
  if (modelId.startsWith("huggingface/")) return "huggingface";
  if (modelId.startsWith("cloudflare/")) return "cloudflare";
  if (modelId.startsWith("perplexity/")) return "perplexity";
  if (modelId === "lmstudio/local-model") return "lmstudio";
  return "bedrock";
}

// ─── Unified router ───────────────────────────────────────────────────────────

export async function callLLM(
  system: string,
  user: string,
  modelId: string,
  maxTokens: number = 4096
): Promise<string> {
  if (modelId.startsWith("ollama/")) return callOllama(modelId, system, user, maxTokens);
  if (modelId === "lmstudio/local-model") return callLMStudio(system, user, maxTokens);
  if (modelId.startsWith("groq/")) return callGroq(modelId, system, user, maxTokens);
  if (modelId.startsWith("google/")) return callGoogle(modelId, system, user, maxTokens);
  if (modelId.startsWith("openrouter/")) return callOpenRouter(modelId, system, user, maxTokens);
  if (modelId.startsWith("huggingface/")) return callHuggingFace(modelId, system, user, maxTokens);
  if (modelId.startsWith("cloudflare/")) return callCloudflare(modelId, system, user, maxTokens);
  if (modelId.startsWith("perplexity/")) return callPerplexity(modelId, system, user, maxTokens);
  // Default: AWS Bedrock
  return callBedrock(system, user, maxTokens, modelId);
}

export async function callLLMJSON<T>(
  system: string,
  user: string,
  modelId: string,
  maxTokens: number = 4096
): Promise<T> {
  const text = await callLLM(system, user, modelId, maxTokens);
  return extractJSON<T>(text);
}
