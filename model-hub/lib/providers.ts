export type Provider = {
  id: string;
  label: string;
  envKey: string;
  baseUrl: string;
  defaultModel: string;
  sampleReply: string;
};

export const PROVIDERS: Provider[] = [
  {
    id: "openai",
    label: "OpenAI",
    envKey: "OPENAI_API_KEY",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-5.4",
    sampleReply: "Sample OpenAI reply. Add OPENAI_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "anthropic",
    label: "Anthropic Claude",
    envKey: "ANTHROPIC_API_KEY",
    baseUrl: "https://api.anthropic.com/v1",
    defaultModel: "claude-sonnet-4-6",
    sampleReply: "Sample Claude reply. Add ANTHROPIC_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "xai",
    label: "xAI Grok",
    envKey: "XAI_API_KEY",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-4.5",
    sampleReply: "Sample Grok reply. Add XAI_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "moonshot",
    label: "Moonshot Kimi",
    envKey: "MOONSHOT_API_KEY",
    baseUrl: "https://api.moonshot.ai/v1",
    defaultModel: "kimi-latest",
    sampleReply: "Sample Kimi reply. Add MOONSHOT_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "gemini",
    label: "Google Gemini",
    envKey: "GEMINI_API_KEY",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.5-flash",
    sampleReply: "Sample Gemini reply. Add GEMINI_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    envKey: "DEEPSEEK_API_KEY",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    sampleReply: "Sample DeepSeek reply. Add DEEPSEEK_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "groq",
    label: "Groq",
    envKey: "GROQ_API_KEY",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    sampleReply: "Sample Groq reply. Add GROQ_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "mistral",
    label: "Mistral",
    envKey: "MISTRAL_API_KEY",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-large-latest",
    sampleReply: "Sample Mistral reply. Add MISTRAL_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    envKey: "OPENROUTER_API_KEY",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "openrouter/auto",
    sampleReply: "Sample OpenRouter reply. Add OPENROUTER_API_KEY in Cursor Secrets to go live.",
  },
  {
    id: "together",
    label: "Together AI",
    envKey: "TOGETHER_API_KEY",
    baseUrl: "https://api.together.ai/v1",
    defaultModel: "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
    sampleReply: "Sample Together reply. Add TOGETHER_API_KEY in Cursor Secrets to go live.",
  },
];

export const SHORT_ALIASES: Record<string, string> = {
  gpt: "openai",
  claude: "anthropic",
  grok: "xai",
  kimi: "moonshot",
  gemini: "gemini",
  deepseek: "deepseek",
};

export function envValue(key: string): string {
  return (process.env[key] || "").trim();
}

export function isConfigured(provider: Provider): boolean {
  return Boolean(envValue(provider.envKey));
}

export function resolveSelection(raw: string): { provider: Provider; model: string } {
  const chosen = raw.trim();
  if (!chosen) {
    throw new Error("Pick a model.");
  }

  let providerId = chosen;
  let model = "";

  if (SHORT_ALIASES[chosen]) {
    providerId = SHORT_ALIASES[chosen];
  } else if (chosen.includes("/")) {
    const idx = chosen.indexOf("/");
    providerId = chosen.slice(0, idx);
    model = chosen.slice(idx + 1);
  }

  const provider = PROVIDERS.find((row) => row.id === providerId);
  if (!provider) {
    throw new Error(`Unknown provider '${providerId}'.`);
  }

  return { provider, model: model || provider.defaultModel };
}

export function statusRows() {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: isConfigured(provider),
    envKey: provider.envKey,
    model: `${provider.id}/${provider.defaultModel}`,
  }));
}
