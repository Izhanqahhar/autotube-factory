export interface ModelDefinition {
  id: string;
  name: string;
  provider: "bedrock" | "ollama" | "lmstudio" | "groq" | "google" | "openrouter" | "huggingface" | "cloudflare" | "pollinations" | "perplexity";
  tier: "local" | "free-cloud" | "aws";
  description: string;
  contextWindow: number;
  costPer1kTokens: number;
  supportsJSON: boolean;
  speed: "ultra-fast" | "very-fast" | "fast" | "medium" | "slow";
  recommended?: boolean;
  requiresKey?: boolean;
  keyEnv?: string;
}

export const ALL_FREE_MODELS: ModelDefinition[] = [
  // ─── Ollama (Local — 100% Free) ────────────────────────────────────────────
  { id: "ollama/llama3.1:8b", name: "Llama 3.1 8B", provider: "ollama", tier: "local", description: "Meta's Llama 3.1 — great all-rounder", contextWindow: 128000, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/llama3.3:70b", name: "Llama 3.3 70B", provider: "ollama", tier: "local", description: "Best quality local — needs 40GB RAM", contextWindow: 128000, costPer1kTokens: 0, supportsJSON: true, speed: "slow" },
  { id: "ollama/mistral:7b", name: "Mistral 7B", provider: "ollama", tier: "local", description: "Fast and lightweight", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/mistral-nemo", name: "Mistral Nemo", provider: "ollama", tier: "local", description: "Strong JSON structured output", contextWindow: 128000, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/phi4:14b", name: "Phi-4 14B", provider: "ollama", tier: "local", description: "Microsoft reasoning model", contextWindow: 16384, costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/phi3:mini", name: "Phi-3 Mini", provider: "ollama", tier: "local", description: "Tiny and very fast", contextWindow: 4096, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast" },
  { id: "ollama/gemma2:9b", name: "Gemma 2 9B", provider: "ollama", tier: "local", description: "Google's Gemma 2 — solid quality", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/gemma2:27b", name: "Gemma 2 27B", provider: "ollama", tier: "local", description: "Google's larger Gemma 2", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/qwen2.5:7b", name: "Qwen 2.5 7B", provider: "ollama", tier: "local", description: "Alibaba — great multilingual", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/qwen2.5:14b", name: "Qwen 2.5 14B", provider: "ollama", tier: "local", description: "Alibaba larger model", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/deepseek-r1:7b", name: "DeepSeek R1 7B", provider: "ollama", tier: "local", description: "Reasoning-focused model", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/deepseek-r1:14b", name: "DeepSeek R1 14B", provider: "ollama", tier: "local", description: "Better reasoning locally", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "slow" },
  // ── Nous Hermes family (best for structured JSON / instruction following) ───
  { id: "ollama/hermes3:8b",              name: "Hermes 3 8B",              provider: "ollama", tier: "local", description: "Best local JSON model — Llama 3.1 based, top instruction following", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "fast",   recommended: true },
  { id: "ollama/hermes3:70b",             name: "Hermes 3 70B",             provider: "ollama", tier: "local", description: "Premium quality — Llama 3.1 70B finetuned, needs 40GB RAM",          contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "slow" },
  { id: "ollama/hermes3:3b",              name: "Hermes 3 3B",              provider: "ollama", tier: "local", description: "Tiny & fast — Llama 3.2 3B finetuned",                               contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast" },
  { id: "ollama/nous-hermes2:10.7b",      name: "Hermes 2 Yi 10.7B",        provider: "ollama", tier: "local", description: "Nous Hermes 2 on Yi — strong JSON & reasoning",                      contextWindow: 4096,   costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/nous-hermes2-mixtral:8x7b", name: "Hermes 2 Mixtral 8×7B", provider: "ollama", tier: "local", description: "Hermes 2 on Mixtral MoE — high quality, needs 32GB RAM",             contextWindow: 32768,  costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/nous-hermes-2-mistral-7b-dpo", name: "Hermes 2 Mistral 7B DPO", provider: "ollama", tier: "local", description: "Classic Hermes 2 — best structured JSON output locally",        contextWindow: 8192,   costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/nous-hermes-llama2-13b",  name: "Hermes Llama 2 13B",       provider: "ollama", tier: "local", description: "Original Hermes on Llama 2 — solid for scripts",                    contextWindow: 4096,   costPer1kTokens: 0, supportsJSON: true, speed: "medium" },
  { id: "ollama/zephyr:7b", name: "Zephyr 7B", provider: "ollama", tier: "local", description: "Good instruction following", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },
  { id: "ollama/neural-chat:7b", name: "Neural Chat 7B", provider: "ollama", tier: "local", description: "Intel's conversational model", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast" },

  // ─── LM Studio (Local — OpenAI compatible) ─────────────────────────────────
  { id: "lmstudio/local-model", name: "LM Studio Active Model", provider: "lmstudio", tier: "local", description: "Whatever model is loaded in LM Studio", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "medium" },

  // ─── Groq (Free cloud — ultra fast) ────────────────────────────────────────
  { id: "groq/llama-3.3-70b-versatile", name: "Llama 3.3 70B", provider: "groq", tier: "free-cloud", description: "Best free cloud model — ultra-fast, 32K ctx", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", recommended: true, requiresKey: true, keyEnv: "GROQ_API_KEY" },
  { id: "groq/llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", provider: "groq", tier: "free-cloud", description: "Fastest model on Groq — great for drafts", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", requiresKey: true, keyEnv: "GROQ_API_KEY" },
  { id: "groq/llama-3.1-70b-versatile", name: "Llama 3.1 70B", provider: "groq", tier: "free-cloud", description: "131K context — separate rate limit bucket", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", requiresKey: true, keyEnv: "GROQ_API_KEY" },
  { id: "groq/moonshard-128k", name: "Moonshard 128K", provider: "groq", tier: "free-cloud", description: "Long-context model on Groq", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", requiresKey: true, keyEnv: "GROQ_API_KEY" },
  { id: "groq/deepseek-r1-distill-llama-70b", name: "DeepSeek R1 Distill 70B", provider: "groq", tier: "free-cloud", description: "Reasoning-focused distilled model", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "GROQ_API_KEY" },
  { id: "groq/mistral-saba-24b", name: "Mistral Saba 24B", provider: "groq", tier: "free-cloud", description: "Mistral 24B on Groq infrastructure", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", requiresKey: true, keyEnv: "GROQ_API_KEY" },

  // ─── Google AI (Free tier) ──────────────────────────────────────────────────
  { id: "google/gemini-2.0-flash", name: "Gemini 2.0 Flash", provider: "google", tier: "free-cloud", description: "Latest Google Flash — fast & capable, 1M ctx", contextWindow: 1048576, costPer1kTokens: 0, supportsJSON: true, speed: "very-fast", recommended: true, requiresKey: true, keyEnv: "GOOGLE_AI_KEY" },
  { id: "google/gemini-2.0-flash-lite", name: "Gemini 2.0 Flash Lite", provider: "google", tier: "free-cloud", description: "Smallest fastest Gemini 2.0 — high RPM", contextWindow: 1048576, costPer1kTokens: 0, supportsJSON: true, speed: "ultra-fast", requiresKey: true, keyEnv: "GOOGLE_AI_KEY" },
  { id: "google/gemini-2.5-flash-preview", name: "Gemini 2.5 Flash Preview", provider: "google", tier: "free-cloud", description: "Google's latest reasoning Flash model", contextWindow: 1048576, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "GOOGLE_AI_KEY" },
  { id: "google/gemini-2.5-pro-preview", name: "Gemini 2.5 Pro Preview", provider: "google", tier: "free-cloud", description: "Most capable Google model — 2M ctx", contextWindow: 2097152, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "GOOGLE_AI_KEY" },
  { id: "google/gemini-1.5-flash", name: "Gemini 1.5 Flash (Stable)", provider: "google", tier: "free-cloud", description: "Proven stable — 15 req/min free", contextWindow: 1000000, costPer1kTokens: 0, supportsJSON: true, speed: "very-fast", requiresKey: true, keyEnv: "GOOGLE_AI_KEY" },

  // ─── OpenRouter Free Models ─────────────────────────────────────────────────
  // Hermes via OpenRouter (cloud, no local GPU needed)
  { id: "openrouter/nousresearch/hermes-3-llama-3.1-405b:free", name: "Hermes 3 405B (OR Free)", provider: "openrouter", tier: "free-cloud", description: "Massive Hermes 3 — Llama 3.1 405B finetuned, free via OpenRouter", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "medium", recommended: true, requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/nousresearch/hermes-3-llama-3.1-70b:free",  name: "Hermes 3 70B (OR Free)",  provider: "openrouter", tier: "free-cloud", description: "Hermes 3 70B via OpenRouter free tier",                          contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/nousresearch/hermes-3-llama-3.1-8b",        name: "Hermes 3 8B (OpenRouter)", provider: "openrouter", tier: "free-cloud", description: "Hermes 3 8B via OpenRouter",                                     contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "fast",   requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B", provider: "openrouter", tier: "free-cloud", description: "Meta Llama 3.3 70B via OpenRouter free", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/deepseek/deepseek-r1:free", name: "DeepSeek R1", provider: "openrouter", tier: "free-cloud", description: "Best reasoning model — free via OpenRouter", contextWindow: 163840, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/deepseek/deepseek-r1-0528:free", name: "DeepSeek R1 0528", provider: "openrouter", tier: "free-cloud", description: "Latest DeepSeek R1 checkpoint", contextWindow: 163840, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/qwen/qwen3-235b-a22b:free", name: "Qwen 3 235B MoE", provider: "openrouter", tier: "free-cloud", description: "Massive MoE model — free on OpenRouter", contextWindow: 40960, costPer1kTokens: 0, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/qwen/qwen3-30b-a3b:free", name: "Qwen 3 30B MoE", provider: "openrouter", tier: "free-cloud", description: "Compact MoE model — fast & free", contextWindow: 40960, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/mistralai/mistral-nemo:free", name: "Mistral Nemo", provider: "openrouter", tier: "free-cloud", description: "Fast JSON model via OpenRouter free", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },
  { id: "openrouter/google/gemma-3-27b-it:free", name: "Gemma 3 27B", provider: "openrouter", tier: "free-cloud", description: "Google Gemma 3 27B — free tier", contextWindow: 131072, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "OPENROUTER_API_KEY" },

  // ─── HuggingFace Inference (Free tier) ─────────────────────────────────────
  { id: "huggingface/mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B (HF)", provider: "huggingface", tier: "free-cloud", description: "Via HuggingFace free inference", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "slow", requiresKey: true, keyEnv: "HUGGINGFACE_API_KEY" },
  { id: "huggingface/Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B (HF)", provider: "huggingface", tier: "free-cloud", description: "Large model via HuggingFace", contextWindow: 32768, costPer1kTokens: 0, supportsJSON: true, speed: "slow", requiresKey: true, keyEnv: "HUGGINGFACE_API_KEY" },

  // ─── Cloudflare Workers AI (Free 10k neurons/day) ──────────────────────────
  { id: "cloudflare/@cf/meta/llama-3.1-8b-instruct", name: "Llama 3.1 8B (CF)", provider: "cloudflare", tier: "free-cloud", description: "Via Cloudflare Workers AI free", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "CLOUDFLARE_AI_KEY" },
  { id: "cloudflare/@cf/mistral/mistral-7b-instruct-v0.1", name: "Mistral 7B (CF)", provider: "cloudflare", tier: "free-cloud", description: "Via Cloudflare Workers AI free", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "CLOUDFLARE_AI_KEY" },
  { id: "cloudflare/@cf/google/gemma-7b-it", name: "Gemma 7B (CF)", provider: "cloudflare", tier: "free-cloud", description: "Google Gemma via Cloudflare", contextWindow: 8192, costPer1kTokens: 0, supportsJSON: true, speed: "fast", requiresKey: true, keyEnv: "CLOUDFLARE_AI_KEY" },

  // ─── AWS Bedrock ─────────────────────────────────────────────────────────────
  { id: "us.anthropic.claude-sonnet-4-6", name: "Claude Sonnet 4.6", provider: "bedrock", tier: "aws", description: "Cross-region profile — us-east-1 required", contextWindow: 200000, costPer1kTokens: 0.003, supportsJSON: true, speed: "fast", recommended: true },
  { id: "us.anthropic.claude-3-5-haiku-20241022-v1:0", name: "Claude Haiku 3.5", provider: "bedrock", tier: "aws", description: "Fast + affordable — cross-region profile", contextWindow: 200000, costPer1kTokens: 0.0008, supportsJSON: true, speed: "very-fast" },
  { id: "us.amazon.nova-pro-v1:0", name: "Amazon Nova Pro", provider: "bedrock", tier: "aws", description: "Amazon's flagship — 300K ctx", contextWindow: 300000, costPer1kTokens: 0.0008, supportsJSON: true, speed: "fast" },
  { id: "us.amazon.nova-lite-v1:0", name: "Amazon Nova Lite", provider: "bedrock", tier: "aws", description: "Fastest Nova — 300K ctx, low cost", contextWindow: 300000, costPer1kTokens: 0.00006, supportsJSON: true, speed: "ultra-fast" },
  { id: "us.amazon.nova-micro-v1:0", name: "Amazon Nova Micro", provider: "bedrock", tier: "aws", description: "Cheapest Nova — text only, very fast", contextWindow: 128000, costPer1kTokens: 0.000035, supportsJSON: true, speed: "ultra-fast" },
  { id: "us.meta.llama3-3-70b-instruct-v1:0", name: "Llama 3.3 70B", provider: "bedrock", tier: "aws", description: "Open source Llama via AWS Bedrock", contextWindow: 128000, costPer1kTokens: 0.00072, supportsJSON: true, speed: "fast" },
  { id: "us.deepseek.r1-v1:0", name: "DeepSeek R1 (Bedrock)", provider: "bedrock", tier: "aws", description: "Reasoning model via AWS Bedrock", contextWindow: 64000, costPer1kTokens: 0.0014, supportsJSON: true, speed: "medium" },

  // ─── Perplexity (Research-optimised — web search built-in) ───────────────────
  { id: "perplexity/sonar-pro", name: "Sonar Pro (Perplexity)", provider: "perplexity", tier: "free-cloud", description: "Best research model — real-time web search, cited sources", contextWindow: 200000, costPer1kTokens: 0.003, supportsJSON: true, speed: "fast", recommended: true, requiresKey: true, keyEnv: "PERPLEXITY_API_KEY" },
  { id: "perplexity/sonar", name: "Sonar (Perplexity)", provider: "perplexity", tier: "free-cloud", description: "Fast web-search model — cheaper", contextWindow: 127072, costPer1kTokens: 0.001, supportsJSON: true, speed: "very-fast", requiresKey: true, keyEnv: "PERPLEXITY_API_KEY" },
  { id: "perplexity/sonar-reasoning-pro", name: "Sonar Reasoning Pro (Perplexity)", provider: "perplexity", tier: "free-cloud", description: "Deep reasoning + web search", contextWindow: 127072, costPer1kTokens: 0.008, supportsJSON: true, speed: "medium", requiresKey: true, keyEnv: "PERPLEXITY_API_KEY" },
];

export const PROVIDER_LABELS: Record<string, { name: string; icon: string; color: string; keyEnv?: string; signupUrl?: string }> = {
  ollama:      { name: "Ollama (Local)", icon: "🏠", color: "green",  signupUrl: "https://ollama.ai" },
  openwebui:   { name: "Open WebUI (Local)", icon: "🌐", color: "cyan", signupUrl: "https://github.com/open-webui/open-webui" },
  lmstudio:    { name: "LM Studio (Local)", icon: "🖥️", color: "indigo", signupUrl: "https://lmstudio.ai" },
  groq:        { name: "Groq (Free Cloud)", icon: "⚡", color: "orange", keyEnv: "GROQ_API_KEY", signupUrl: "https://console.groq.com" },
  google:      { name: "Google AI Studio (Free)", icon: "🔵", color: "blue", keyEnv: "GOOGLE_AI_KEY", signupUrl: "https://aistudio.google.com" },
  openrouter:  { name: "OpenRouter (Free Tier)", icon: "🌐", color: "purple", keyEnv: "OPENROUTER_API_KEY", signupUrl: "https://openrouter.ai" },
  huggingface: { name: "HuggingFace (Free)", icon: "🤗", color: "yellow", keyEnv: "HUGGINGFACE_API_KEY", signupUrl: "https://huggingface.co" },
  cloudflare:  { name: "Cloudflare AI (Free)", icon: "☁️", color: "gray", keyEnv: "CLOUDFLARE_AI_KEY", signupUrl: "https://cloudflare.com" },
  bedrock:     { name: "AWS Bedrock", icon: "🌩️", color: "amber", keyEnv: "AWS_ACCESS_KEY_ID" },
  perplexity:  { name: "Perplexity (Research AI)", icon: "🔍", color: "teal", keyEnv: "PERPLEXITY_API_KEY", signupUrl: "https://www.perplexity.ai/api" },
};

// Fallback chain — confirmed-working model IDs (May 2026)
// Google: uses v1beta API with camelCase systemInstruction field
// Bedrock: cross-region profiles require us-east-1 or us-west-2
export const FREE_MODEL_PRIORITY = [
  "us.anthropic.claude-sonnet-4-6",                                  // AWS Bedrock Claude Sonnet 4.6
  "groq/llama-3.3-70b-versatile",                                    // Groq — ultra fast, 32K ctx
  "groq/llama-3.1-8b-instant",                                       // Groq — fastest, 131K ctx
  "google/gemini-2.0-flash",                                         // Google — fast, 1M ctx
  "google/gemini-2.5-flash-preview",                                 // Google — reasoning flash
  "google/gemini-1.5-flash",                                         // Google — stable fallback
  "openrouter/nousresearch/hermes-3-llama-3.1-405b:free",            // Hermes 3 405B — free cloud
  "openrouter/meta-llama/llama-3.3-70b-instruct:free",               // OpenRouter free
  "openrouter/deepseek/deepseek-r1:free",                            // DeepSeek R1 via OR
  "ollama/hermes3:8b",                                               // Hermes 3 local (best JSON)
  "ollama/llama3.1:8b",                                              // Local fallback
  "ollama/mistral:7b",
];

// AWS Bedrock Claude Sonnet 4.6 is default — user's preferred model (cross-region inference profile)
export const DEFAULT_MODEL_ID = "us.anthropic.claude-sonnet-4-6";

export function getModel(id: string): ModelDefinition | undefined {
  return ALL_FREE_MODELS.find((m) => m.id === id);
}

export function getModelsByProvider(provider: string): ModelDefinition[] {
  return ALL_FREE_MODELS.filter((m) => m.provider === provider);
}

// Keep backward compat alias
export const AVAILABLE_MODELS = ALL_FREE_MODELS;
