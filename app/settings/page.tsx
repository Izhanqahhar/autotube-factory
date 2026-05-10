"use client";
import { useState, useEffect } from "react";

interface ProviderStatus {
  available: boolean;
  reason?: string;
  models?: string[];
}

type Tab = "ai" | "tts" | "images" | "rss" | "keys" | "automation" | "integrations";

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "ai", label: "AI Models", icon: "🤖" },
  { id: "tts", label: "TTS / Voice", icon: "🎙️" },
  { id: "images", label: "Image Generation", icon: "🖼️" },
  { id: "rss", label: "RSS Feeds", icon: "📡" },
  { id: "keys", label: "API Keys", icon: "🔑" },
  { id: "automation", label: "Automation", icon: "⚡" },
  { id: "integrations", label: "Integrations", icon: "🔗" },
];

const AI_PROVIDERS = [
  {
    id: "bedrock",
    name: "AWS Bedrock",
    icon: "☁️",
    tier: "aws",
    color: "orange",
    description: "Amazon Web Services AI. Best for production. Claude Sonnet 4.5, Nova, Llama available.",
    signupUrl: "https://aws.amazon.com/bedrock/",
    envVars: [
      { key: "AWS_ACCESS_KEY_ID", desc: "AWS access key ID", secret: true },
      { key: "AWS_SECRET_ACCESS_KEY", desc: "AWS secret access key", secret: true },
      { key: "AWS_REGION", desc: "Region — e.g. us-east-1", secret: false },
      { key: "BEDROCK_MODEL_ID", desc: "Default model ID — e.g. us.anthropic.claude-sonnet-4-6", secret: false },
    ],
  },
  {
    id: "groq",
    name: "Groq",
    icon: "⚡",
    tier: "free-cloud",
    color: "yellow",
    description: "Blazing-fast inference. FREE tier available. Llama 3.3 70B, Llama 3.1 8B, Mixtral.",
    signupUrl: "https://console.groq.com",
    envVars: [
      { key: "GROQ_API_KEY", desc: "Free at console.groq.com — gsk_...", secret: true },
    ],
  },
  {
    id: "google",
    name: "Google AI (Gemini)",
    icon: "🔵",
    tier: "free-cloud",
    color: "blue",
    description: "Google Gemini 2.0 Flash — fast and FREE with generous limits.",
    signupUrl: "https://aistudio.google.com",
    envVars: [
      { key: "GOOGLE_AI_KEY", desc: "Free at aistudio.google.com — AIza...", secret: true },
    ],
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    icon: "🏠",
    tier: "local",
    color: "green",
    description: "Run models completely offline. Hermes 3, Llama 3.1, Phi-3, Qwen 2.5 and 30+ more.",
    signupUrl: "https://ollama.com",
    envVars: [
      { key: "OLLAMA_URL", desc: "Server URL (default: http://localhost:11434)", secret: false },
    ],
    setupSteps: [
      { label: "1. Install Ollama", cmd: "winget install Ollama.Ollama" },
      { label: "2. Pull a model", cmd: "ollama pull hermes3:8b" },
      { label: "3. Verify running", cmd: "ollama list" },
    ],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    icon: "🌐",
    tier: "free-cloud",
    color: "purple",
    description: "Gateway to 100+ models. Many FREE tiers — DeepSeek, Gemini, Mistral, Llama.",
    signupUrl: "https://openrouter.ai/keys",
    envVars: [
      { key: "OPENROUTER_API_KEY", desc: "Free tier available — sk-or-...", secret: true },
    ],
  },
  {
    id: "huggingface",
    name: "HuggingFace Inference",
    icon: "🤗",
    tier: "free-cloud",
    color: "yellow",
    description: "FREE serverless inference. Zephyr 7B, Mistral, Phi-3 and many others.",
    signupUrl: "https://huggingface.co/settings/tokens",
    envVars: [
      { key: "HUGGINGFACE_API_KEY", desc: "Free read token — hf_...", secret: true },
    ],
  },
  {
    id: "cloudflare",
    name: "Cloudflare Workers AI",
    icon: "🧡",
    tier: "free-cloud",
    color: "orange",
    description: "10,000 free neurons/day. Llama 3, Mistral, Phi-2 and more at the edge.",
    signupUrl: "https://dash.cloudflare.com",
    envVars: [
      { key: "CLOUDFLARE_ACCOUNT_ID", desc: "Your Cloudflare account ID", secret: false },
      { key: "CLOUDFLARE_API_TOKEN", desc: "Workers AI token — Free tier", secret: true },
    ],
  },
  {
    id: "lmstudio",
    name: "LM Studio (Local)",
    icon: "💻",
    tier: "local",
    color: "green",
    description: "GUI app for running models locally. OpenAI-compatible API on port 1234.",
    signupUrl: "https://lmstudio.ai",
    envVars: [
      { key: "LMSTUDIO_URL", desc: "API URL (default: http://localhost:1234)", secret: false },
    ],
  },
];

const TTS_ENGINES = [
  {
    id: "edge-tts",
    name: "Microsoft Edge TTS",
    icon: "🔵",
    tier: "free",
    description: "100% free. 300+ voices in 60+ languages. Neural quality. Requires Python.",
    voices: ["en-US-AriaNeural", "en-US-GuyNeural", "en-GB-SoniaNeural", "en-AU-NatashaNeural"],
    installCmd: "pip install edge-tts",
    usageExample: "python -m edge_tts --voice en-US-AriaNeural --text 'Hello' --write-media out.mp3",
    envVars: [],
  },
  {
    id: "gtts",
    name: "Google TTS (gTTS)",
    icon: "🟢",
    tier: "free",
    description: "Uses Google Translate TTS. Simple, works offline once cached. Python required.",
    voices: ["en", "en-uk", "en-au", "en-ca"],
    installCmd: "pip install gtts",
    usageExample: "python -c \"from gtts import gTTS; gTTS('Hello').save('out.mp3')\"",
    envVars: [],
  },
  {
    id: "coqui",
    name: "Coqui TTS",
    icon: "🐸",
    tier: "free",
    description: "Open-source neural TTS. High quality, runs locally. Many voice models.",
    voices: ["tts_models/en/ljspeech/tacotron2-DDC", "tts_models/en/vctk/vits"],
    installCmd: "pip install TTS",
    usageExample: "tts --text 'Hello' --out_path out.wav",
    envVars: [],
  },
  {
    id: "elevenlabs",
    name: "ElevenLabs",
    icon: "✨",
    tier: "freemium",
    description: "Best quality neural voices. Free tier: 10,000 chars/month. Ultra-realistic.",
    voices: ["Rachel", "Antoni", "Bella", "Josh", "Arnold"],
    signupUrl: "https://elevenlabs.io",
    envVars: [
      { key: "ELEVENLABS_API_KEY", desc: "Free tier available", secret: true },
    ],
  },
];

const IMAGE_SOURCES = [
  {
    id: "pollinations",
    name: "Pollinations.ai",
    icon: "🌸",
    tier: "completely-free",
    description: "100% FREE — no API key, no signup, no limits. FLUX model. Just a GET request.",
    apiExample: "https://image.pollinations.ai/prompt/your-prompt?width=1280&height=720&model=flux",
    envVars: [],
  },
  {
    id: "huggingface-img",
    name: "HuggingFace (Images)",
    icon: "🤗",
    tier: "free",
    description: "Free serverless SDXL, FLUX, and more. Same API key as HF text models.",
    envVars: [
      { key: "HUGGINGFACE_API_KEY", desc: "Same key as text inference — hf_...", secret: true },
    ],
  },
  {
    id: "unsplash",
    name: "Unsplash",
    icon: "📷",
    tier: "free",
    description: "Free stock photos. 50 requests/hour. Best for real-world photographic shots.",
    signupUrl: "https://unsplash.com/developers",
    envVars: [
      { key: "UNSPLASH_ACCESS_KEY", desc: "Free — unsplash.com/developers", secret: true },
    ],
  },
  {
    id: "pexels",
    name: "Pexels",
    icon: "🎞️",
    tier: "free",
    description: "Free stock photos & videos. 200 requests/hour.",
    signupUrl: "https://www.pexels.com/api/",
    envVars: [
      { key: "PEXELS_API_KEY", desc: "Free — pexels.com/api", secret: true },
    ],
  },
  {
    id: "pixabay",
    name: "Pixabay",
    icon: "🌍",
    tier: "free",
    description: "Free stock images. 100 requests/minute. Large library.",
    signupUrl: "https://pixabay.com/api/docs/",
    envVars: [
      { key: "PIXABAY_API_KEY", desc: "Free — pixabay.com/api/docs", secret: true },
    ],
  },
];

const ALL_API_KEYS = [
  { key: "AWS_ACCESS_KEY_ID", group: "AWS Bedrock", secret: true },
  { key: "AWS_SECRET_ACCESS_KEY", group: "AWS Bedrock", secret: true },
  { key: "AWS_REGION", group: "AWS Bedrock", secret: false, example: "us-east-1" },
  { key: "BEDROCK_MODEL_ID", group: "AWS Bedrock", secret: false, example: "us.anthropic.claude-sonnet-4-6" },
  { key: "GROQ_API_KEY", group: "Groq (Free)", secret: true, example: "gsk_..." },
  { key: "GOOGLE_AI_KEY", group: "Google AI (Free)", secret: true, example: "AIza..." },
  { key: "OPENROUTER_API_KEY", group: "OpenRouter (Free tier)", secret: true, example: "sk-or-..." },
  { key: "HUGGINGFACE_API_KEY", group: "HuggingFace (Free)", secret: true, example: "hf_..." },
  { key: "CLOUDFLARE_ACCOUNT_ID", group: "Cloudflare Workers AI", secret: false },
  { key: "CLOUDFLARE_API_TOKEN", group: "Cloudflare Workers AI", secret: true },
  { key: "OLLAMA_URL", group: "Ollama (Local)", secret: false, example: "http://localhost:11434" },
  { key: "LMSTUDIO_URL", group: "LM Studio (Local)", secret: false, example: "http://localhost:1234" },
  { key: "PERPLEXITY_API_KEY", group: "Perplexity AI", secret: true, example: "pplx-..." },
  { key: "UNSPLASH_ACCESS_KEY", group: "Unsplash Images (Free)", secret: true },
  { key: "PEXELS_API_KEY", group: "Pexels Images (Free)", secret: true },
  { key: "PIXABAY_API_KEY", group: "Pixabay Images (Free)", secret: true },
  { key: "ELEVENLABS_API_KEY", group: "ElevenLabs TTS", secret: true },
  { key: "AIRTABLE_API_KEY", group: "Airtable", secret: true, example: "patXXX..." },
  { key: "AIRTABLE_BASE_ID", group: "Airtable", secret: false, example: "appXXXXXXXXXXXXXX" },
  { key: "AIRTABLE_RUNS_TABLE_ID", group: "Airtable", secret: false, example: "tblXXXXXXXXXXXXXX" },
  { key: "AIRTABLE_STEPS_TABLE_ID", group: "Airtable", secret: false, example: "tblXXXXXXXXXXXXXX" },
  { key: "AIRTABLE_ASSETS_TABLE_ID", group: "Airtable", secret: false, example: "tblXXXXXXXXXXXXXX" },
  { key: "AIRTABLE_PROMPTS_TABLE_ID", group: "Airtable", secret: false, example: "tblXXXXXXXXXXXXXX" },
  { key: "NOTION_API_KEY", group: "Notion", secret: true, example: "ntn_..." },
  { key: "NOTION_PARENT_PAGE_ID", group: "Notion", secret: false, example: "32-char page ID from URL" },
  { key: "SLACK_BOT_TOKEN", group: "Slack", secret: true, example: "xoxb-..." },
  { key: "SLACK_CHANNEL_ID", group: "Slack", secret: false, example: "C0B3MDH3KNC" },
  { key: "NEXT_PUBLIC_APP_URL", group: "App Config", secret: false, example: "http://localhost:3001" },
];

// ── Integration card data ─────────────────────────────────────────────────
const INTEGRATIONS = [
  {
    id: "perplexity",
    name: "Perplexity AI",
    icon: "🔍",
    color: "teal",
    colorClass: "border-teal-800/40 bg-teal-900/10",
    badgeClass: "bg-teal-900/30 text-teal-300 border-teal-700/40",
    badge: "Research AI",
    description: "Real-time web search + AI synthesis. Use as Research model in New Video to get up-to-date facts. Sonar Pro searches the web before answering.",
    signupUrl: "https://www.perplexity.ai/settings/api",
    docsUrl: "https://docs.perplexity.ai",
    envVars: [
      { key: "PERPLEXITY_API_KEY", desc: "API key from perplexity.ai/settings/api", secret: true, example: "pplx-..." },
    ],
    setupSteps: [
      "1. Go to perplexity.ai/settings/api and create an API key",
      "2. Add PERPLEXITY_API_KEY to .env.local",
      "3. In New Video form → expand ▼ Set different model per step → choose Perplexity Sonar Pro for Research",
    ],
    testEndpoint: "/api/models/status",
    testLabel: "Check Model Status",
  },
  {
    id: "airtable",
    name: "Airtable",
    icon: "📊",
    color: "green",
    colorClass: "border-green-800/40 bg-green-900/10",
    badgeClass: "bg-green-900/30 text-green-300 border-green-700/40",
    badge: "Export / Database",
    description: "Automatically export every completed project to Airtable. Logs run metadata, YouTube titles/tags, thumbnail URL, prompts and assets — perfect for a content calendar.",
    signupUrl: "https://airtable.com",
    docsUrl: "https://airtable.com/developers/web/api/introduction",
    envVars: [
      { key: "AIRTABLE_API_KEY", desc: "Personal access token — airtable.com/create/tokens", secret: true, example: "patXXX..." },
      { key: "AIRTABLE_BASE_ID", desc: "Base ID from base URL: airtable.com/appXXX/...", secret: false, example: "appse0mCSULJ5auaY" },
      { key: "AIRTABLE_RUNS_TABLE_ID", desc: "Table ID for Runs (tbl...)", secret: false, example: "tblu1Wouh5zgyfQY7" },
      { key: "AIRTABLE_STEPS_TABLE_ID", desc: "Table ID for Steps (tbl...)", secret: false, example: "tblvBjyaeIRcTmjC1" },
      { key: "AIRTABLE_ASSETS_TABLE_ID", desc: "Table ID for Assets (tbl...)", secret: false, example: "tblw2IgTno5yA3nkd" },
      { key: "AIRTABLE_PROMPTS_TABLE_ID", desc: "Table ID for Prompts (tbl...)", secret: false, example: "tblXWVj2KsV4aLLNS" },
    ],
    setupSteps: [
      "1. Create an Airtable base with tables: Runs, Steps, Assets, Prompts",
      "2. Get a Personal Access Token at airtable.com/create/tokens (scope: data.records:write)",
      "3. Open each table → Help → API docs → copy the table ID (tbl...)",
      "4. Add all env vars to .env.local — runs will export automatically on project completion",
    ],
    testEndpoint: null,
    testLabel: null,
  },
  {
    id: "notion",
    name: "Notion",
    icon: "📝",
    color: "white",
    colorClass: "border-gray-700/60 bg-gray-800/20",
    badgeClass: "bg-gray-800/60 text-gray-300 border-gray-700/40",
    badge: "Page Creator",
    description: "Creates a structured Notion page for every completed project — includes research summary, full script, YouTube titles/tags, image prompts and model metadata. Great for content review.",
    signupUrl: "https://www.notion.so/my-integrations",
    docsUrl: "https://developers.notion.com/docs/getting-started",
    envVars: [
      { key: "NOTION_API_KEY", desc: "Integration token from notion.so/my-integrations", secret: true, example: "ntn_..." },
      { key: "NOTION_PARENT_PAGE_ID", desc: "ID of the page to create projects under (share with integration)", secret: false, example: "abc123...32chars" },
    ],
    setupSteps: [
      "1. Go to notion.so/my-integrations → New integration → copy the Internal Integration Token",
      "2. Open the Notion page that should be the parent → Share → invite your integration",
      "3. Copy the page ID from the URL: notion.so/My-Page-{PAGE_ID}",
      "4. Set NOTION_API_KEY + NOTION_PARENT_PAGE_ID in .env.local",
    ],
    testEndpoint: null,
    testLabel: null,
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    color: "purple",
    colorClass: "border-purple-800/40 bg-purple-900/10",
    badgeClass: "bg-purple-900/30 text-purple-300 border-purple-700/40",
    badge: "Notifications",
    description: "Sends a rich Block Kit notification to a Slack channel when each project finishes — includes title, scores, YouTube metadata, thumbnail preview and links to Notion.",
    signupUrl: "https://api.slack.com/apps",
    docsUrl: "https://api.slack.com/messaging/composing/layouts",
    envVars: [
      { key: "SLACK_BOT_TOKEN", desc: "Bot User OAuth Token (xoxb-...) from OAuth & Permissions — NOT xapp-", secret: true, example: "xoxb-..." },
      { key: "SLACK_CHANNEL_ID", desc: "Channel ID (right-click channel → Copy link → last segment)", secret: false, example: "C0B3MDH3KNC" },
    ],
    setupSteps: [
      "1. api.slack.com/apps → Create New App → From scratch",
      "2. OAuth & Permissions → Bot Token Scopes: chat:write, files:write",
      "3. Install to Workspace → copy 'Bot User OAuth Token' (starts with xoxb-, NOT xapp-)",
      "4. Invite bot to channel: /invite @YourBotName",
      "5. Set SLACK_BOT_TOKEN + SLACK_CHANNEL_ID in .env.local",
    ],
    testEndpoint: null,
    testLabel: null,
  },
];

const AUTOMATION_VARS = [
  { key: "ENABLE_AUTO_FETCH", desc: "Enable scheduled RSS auto-fetch", example: "true", group: "RSS Scheduler" },
  { key: "RSS_FETCH_INTERVAL_HOURS", desc: "How often to auto-fetch RSS (hours)", example: "6", group: "RSS Scheduler" },
  { key: "NEXT_PUBLIC_APP_URL", desc: "App base URL (for internal API calls)", example: "http://localhost:3001", group: "App Config" },
];

const FREE_RESEARCH_TOOLS = [
  { name: "YouTube Autocomplete", endpoint: "suggestqueries.google.com", key: false, desc: "Keyword suggestions from YouTube search" },
  { name: "Google Autocomplete", endpoint: "suggestqueries.google.com", key: false, desc: "Google search keyword suggestions" },
  { name: "Wikipedia REST API", endpoint: "en.wikipedia.org/api/rest_v1", key: false, desc: "Article summaries and context" },
  { name: "arXiv API", endpoint: "export.arxiv.org/api", key: false, desc: "Scientific papers for tech content" },
  { name: "Hacker News API", endpoint: "hacker-news.firebaseio.com", key: false, desc: "Top tech stories and trends" },
  { name: "Reddit JSON API", endpoint: "reddit.com/r/{sub}/hot.json", key: false, desc: "Trending posts from any subreddit" },
  { name: "DEV.to API", endpoint: "dev.to/api/articles", key: false, desc: "Developer articles and tutorials" },
];

const TIER_COLORS: Record<string, string> = {
  "completely-free": "bg-green-900/30 text-green-400 border-green-800/40",
  free: "bg-green-900/20 text-green-400 border-green-800/30",
  "free-cloud": "bg-blue-900/20 text-blue-400 border-blue-800/30",
  local: "bg-teal-900/20 text-teal-400 border-teal-800/30",
  freemium: "bg-yellow-900/20 text-yellow-400 border-yellow-800/30",
  aws: "bg-orange-900/20 text-orange-400 border-orange-800/30",
};

function TierBadge({ tier }: { tier: string }) {
  const labels: Record<string, string> = {
    "completely-free": "🆓 No key needed",
    free: "🆓 Free",
    "free-cloud": "☁️ Free cloud",
    local: "🏠 Local",
    freemium: "💎 Freemium",
    aws: "☁️ AWS",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border ${TIER_COLORS[tier] ?? "bg-gray-800 text-gray-400 border-gray-700"}`}>
      {labels[tier] ?? tier}
    </span>
  );
}

function EnvVarRow({ envKey, desc, secret, example }: { envKey: string; desc?: string; secret?: boolean; example?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-start gap-3 bg-gray-800/50 rounded-lg px-3 py-2 group">
      <code className="text-purple-300 text-xs font-mono shrink-0 mt-0.5">{envKey}</code>
      <div className="flex-1 min-w-0">
        {desc && <div className="text-gray-500 text-xs">{desc}{secret && " (secret)"}</div>}
        {example && <code className="text-gray-600 text-xs">{example}</code>}
      </div>
      <button
        onClick={() => { navigator.clipboard.writeText(`${envKey}=`); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="text-xs text-gray-600 hover:text-gray-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
        title="Copy key name"
      >
        {copied ? "✓" : "📋"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("ai");
  const [status, setStatus] = useState<Record<string, ProviderStatus>>({});
  const [loading, setLoading] = useState(true);
  const [testResults, setTestResults] = useState<Record<string, "testing" | "ok" | "fail">>({});

  useEffect(() => {
    fetch("/api/models/status")
      .then((r) => r.json())
      .then(setStatus)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function testProvider(id: string) {
    setTestResults((t) => ({ ...t, [id]: "testing" }));
    try {
      const r = await fetch("/api/models/status");
      const s = await r.json();
      setTestResults((t) => ({ ...t, [id]: s[id]?.available ? "ok" : "fail" }));
    } catch {
      setTestResults((t) => ({ ...t, [id]: "fail" }));
    }
  }

  function copyEnvTemplate() {
    const lines = [
      "# AutoTube Factory — .env.local",
      "# Copy this file and fill in values. DO NOT commit to git.",
      "",
      "# ─── AWS Bedrock (last resort fallback) ───",
      "AWS_ACCESS_KEY_ID=",
      "AWS_SECRET_ACCESS_KEY=",
      "AWS_REGION=us-east-1",
      "BEDROCK_MODEL_ID=us.anthropic.claude-sonnet-4-6",
      "",
      "# ─── FREE Cloud LLMs (priority order) ───",
      "GROQ_API_KEY=               # gsk_... — free at console.groq.com",
      "GOOGLE_AI_KEY=              # AIza... — free at aistudio.google.com",
      "OPENROUTER_API_KEY=         # sk-or-... — free tier at openrouter.ai",
      "HUGGINGFACE_API_KEY=        # hf_... — free at huggingface.co/settings/tokens",
      "",
      "# ─── Cloudflare Workers AI (free 10k neurons/day) ───",
      "CLOUDFLARE_ACCOUNT_ID=",
      "CLOUDFLARE_API_TOKEN=",
      "",
      "# ─── Local LLMs ───",
      "OLLAMA_URL=http://localhost:11434",
      "LMSTUDIO_URL=http://localhost:1234",
      "",
      "# ─── Image Generation ───",
      "# Pollinations.ai — NO KEY NEEDED, completely free",
      "UNSPLASH_ACCESS_KEY=        # free at unsplash.com/developers",
      "PEXELS_API_KEY=             # free at pexels.com/api",
      "PIXABAY_API_KEY=            # free at pixabay.com/api/docs",
      "",
      "# ─── TTS (optional cloud) ───",
      "ELEVENLABS_API_KEY=         # optional premium TTS",
      "",
      "# ─── RSS / Automation ───",
      "ENABLE_AUTO_FETCH=false",
      "RSS_FETCH_INTERVAL_HOURS=6",
      "",
      "# ─── App Config ───",
      "NEXT_PUBLIC_APP_URL=http://localhost:3001",
    ].join("\n");
    navigator.clipboard.writeText(lines);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">⚙️ Settings</h1>
        <p className="text-gray-400 mt-1 text-sm">Configure AI providers, TTS engines, image generation, and automation.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 bg-gray-900/60 border border-gray-800 rounded-xl p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-purple-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <span>{t.icon}</span>
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── TAB: AI Models ── */}
      {tab === "ai" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">AI Model Providers</h2>
            <div className="text-xs text-gray-500">Priority: Groq → Google → Ollama → OpenRouter → Bedrock</div>
          </div>

          {loading && <div className="text-gray-500 text-sm py-4">Checking provider status...</div>}

          {!loading && AI_PROVIDERS.map((p) => {
            const s = status[p.id];
            const testResult = testResults[p.id];
            return (
              <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{p.icon}</span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-white">{p.name}</span>
                        <TierBadge tier={p.tier} />
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium ${
                      s?.available ? "bg-green-900/30 text-green-400" : "bg-red-900/20 text-red-400"
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s?.available ? "bg-green-500" : "bg-red-500"}`} />
                      {s?.available ? "Connected" : "Not configured"}
                    </div>
                    <button
                      onClick={() => testProvider(p.id)}
                      disabled={testResult === "testing"}
                      className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 px-2 py-1 rounded-lg transition-colors"
                    >
                      {testResult === "testing" ? "Testing..." : testResult === "ok" ? "✓ OK" : testResult === "fail" ? "✗ Fail" : "Test"}
                    </button>
                  </div>
                </div>

                {s && !s.available && s.reason && (
                  <div className="bg-red-900/10 border border-red-900/30 rounded-lg px-3 py-2 text-xs text-red-400">
                    {s.reason}
                  </div>
                )}

                {s?.models && s.models.length > 0 && (
                  <div className="text-xs text-gray-500">
                    <span className="text-gray-400">Installed: </span>
                    {s.models.slice(0, 6).join(", ")}
                    {s.models.length > 6 && ` +${s.models.length - 6} more`}
                  </div>
                )}

                {p.envVars.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Required in .env.local</div>
                    {p.envVars.map((e) => <EnvVarRow key={e.key} envKey={e.key} desc={e.desc} secret={e.secret} />)}
                  </div>
                )}

                {p.setupSteps && (
                  <div className="space-y-2 border-t border-gray-800 pt-3">
                    <div className="text-xs font-medium text-gray-500">Quick Setup (Windows)</div>
                    {p.setupSteps.map((step) => (
                      <div key={step.label} className="flex items-center gap-3">
                        <span className="text-xs text-gray-600 w-28 shrink-0">{step.label}</span>
                        <code className="text-xs bg-gray-800 text-green-400 px-2 py-1 rounded font-mono flex-1 overflow-x-auto">{step.cmd}</code>
                        <button onClick={() => navigator.clipboard.writeText(step.cmd)} className="text-gray-600 hover:text-gray-400 text-xs shrink-0">📋</button>
                      </div>
                    ))}
                  </div>
                )}

                {p.signupUrl && (
                  <a href={p.signupUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                    Get API key →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── TAB: TTS / Voice ── */}
      {tab === "tts" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Text-to-Speech Engines</h2>
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl p-4 text-xs text-blue-300">
            💡 All TTS engines below work in the <strong>Voiceover tab</strong> on any project. Edge TTS and gTTS are 100% free and require only Python.
          </div>

          {TTS_ENGINES.map((e) => (
            <div key={e.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{e.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{e.name}</span>
                      <TierBadge tier={e.tier} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{e.description}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">Available voices: {e.voices.join(", ")}</div>
                {e.installCmd && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 w-24 shrink-0">Install:</span>
                    <code className="text-xs bg-gray-800 text-green-400 px-2 py-1 rounded font-mono flex-1">{e.installCmd}</code>
                    <button onClick={() => navigator.clipboard.writeText(e.installCmd!)} className="text-gray-600 hover:text-gray-400 text-xs">📋</button>
                  </div>
                )}
                {e.usageExample && (
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-600 w-24 shrink-0 pt-1">Example:</span>
                    <code className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded font-mono flex-1 leading-relaxed">{e.usageExample}</code>
                  </div>
                )}
              </div>

              {e.envVars && e.envVars.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Required in .env.local</div>
                  {e.envVars.map((v) => <EnvVarRow key={v.key} envKey={v.key} desc={v.desc} secret={v.secret} />)}
                </div>
              )}

              {e.signupUrl && (
                <a href={e.signupUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                  Get API key →
                </a>
              )}
            </div>
          ))}

          {/* Python check tip */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
            <div className="text-sm font-medium text-white">Python Setup (for Edge TTS &amp; gTTS)</div>
            <div className="space-y-1.5">
              {[
                { label: "Check Python", cmd: "python --version" },
                { label: "Install both", cmd: "pip install edge-tts gtts" },
                { label: "Test Edge TTS", cmd: "python -m edge_tts --voice en-US-AriaNeural --text \"Hello World\" --write-media test.mp3" },
              ].map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  <span className="text-xs text-gray-600 w-24 shrink-0">{step.label}</span>
                  <code className="text-xs bg-gray-800 text-green-400 px-2 py-1 rounded font-mono flex-1 overflow-x-auto">{step.cmd}</code>
                  <button onClick={() => navigator.clipboard.writeText(step.cmd)} className="text-gray-600 hover:text-gray-400 text-xs">📋</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Image Generation ── */}
      {tab === "images" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Image Generation Sources</h2>
          <div className="bg-green-900/10 border border-green-800/30 rounded-xl p-4 text-xs text-green-300">
            🌸 <strong>Pollinations.ai requires ZERO setup</strong> — completely free, no API key, no signup. Works right now.
          </div>

          {IMAGE_SOURCES.map((s) => (
            <div key={s.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{s.icon}</span>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white">{s.name}</span>
                      <TierBadge tier={s.tier} />
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{s.description}</div>
                  </div>
                </div>
              </div>

              {s.apiExample && (
                <div className="bg-gray-800/60 rounded-lg px-3 py-2">
                  <div className="text-xs text-gray-500 mb-1">API URL format:</div>
                  <code className="text-xs text-green-400 font-mono break-all">{s.apiExample}</code>
                </div>
              )}

              {s.envVars.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Required in .env.local</div>
                  {s.envVars.map((v) => <EnvVarRow key={v.key} envKey={v.key} desc={v.desc} secret={v.secret} />)}
                </div>
              )}

              {s.signupUrl && (
                <a href={s.signupUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300">
                  Get API key →
                </a>
              )}
            </div>
          ))}

          {/* Usage guide */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
            <div className="text-sm font-medium text-white">How Image Generation Works</div>
            <div className="space-y-1 text-xs text-gray-500">
              <div>1. On any project → <span className="text-gray-300">Image Prompts tab</span> → click <span className="text-green-400">🌸 Generate Image</span> on any prompt</div>
              <div>2. Choose source: Pollinations (instant, free) or stock photo providers</div>
              <div>3. Images download to <code className="text-purple-400">public/generated/images/</code> and are shown as previews</div>
              <div>4. Use "Bulk Generate All" to generate images for all prompts at once</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: RSS Feeds ── */}
      {tab === "rss" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">RSS &amp; Free Research Tools</h2>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="text-sm font-medium text-white">RSS Feed System</div>
            <p className="text-xs text-gray-500">AutoTube monitors 20+ RSS feeds across Tech, AI, Business, Health niches. New articles are scored by trend score and used to suggest video topics automatically.</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              {[
                { label: "Default Feeds", value: "20+" },
                { label: "Niches", value: "4" },
                { label: "Format Support", value: "RSS, Reddit JSON, DEV.to" },
                { label: "Auto-Fetch", value: "via node-cron" },
              ].map((s) => (
                <div key={s.label} className="bg-gray-800/50 rounded-lg p-3 text-center">
                  <div className="text-white text-sm font-semibold">{s.value}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <a href="/memory" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                Manage Feeds →
              </a>
              <a href="/digest" className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors">
                View Digest →
              </a>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="text-sm font-medium text-white">Free Research APIs (No Key Required)</div>
            <div className="space-y-2">
              {FREE_RESEARCH_TOOLS.map((t) => (
                <div key={t.name} className="flex items-center gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                  <span className="text-green-400 text-xs font-mono shrink-0">✓ Free</span>
                  <div className="flex-1">
                    <div className="text-white text-xs font-medium">{t.name}</div>
                    <div className="text-gray-600 text-xs">{t.desc}</div>
                  </div>
                  <code className="text-gray-600 text-xs hidden sm:block shrink-0">{t.endpoint}</code>
                </div>
              ))}
            </div>
            <div className="text-xs text-gray-600 pt-1">
              Access via <code className="text-purple-400">/api/research/keywords?q=your-topic&type=all</code>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: API Keys ── */}
      {tab === "keys" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">API Keys Reference</h2>
            <button
              onClick={copyEnvTemplate}
              className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
            >
              📋 Copy .env.local Template
            </button>
          </div>

          <div className="bg-yellow-900/10 border border-yellow-800/30 rounded-xl px-4 py-3 text-xs text-yellow-300">
            ⚠️ Add these to <code className="text-yellow-200">autotube-factory/.env.local</code> — never commit this file to git. Restart dev server after changes.
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="text-sm font-medium text-white mb-3">All Environment Variables</div>
            {(() => {
              const groups = [...new Set(ALL_API_KEYS.map((k) => k.group))];
              return groups.map((group) => (
                <div key={group} className="space-y-1.5">
                  <div className="text-xs font-medium text-gray-500 uppercase tracking-wider mt-3 first:mt-0">{group}</div>
                  {ALL_API_KEYS.filter((k) => k.group === group).map((k) => (
                    <EnvVarRow key={k.key} envKey={k.key} secret={k.secret} example={k.example} />
                  ))}
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* ── TAB: Automation ── */}
      {tab === "automation" && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Automation &amp; Scheduler</h2>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
            <div className="text-sm font-medium text-white">RSS Auto-Fetch Scheduler</div>
            <p className="text-xs text-gray-500">When enabled, AutoTube automatically fetches all active RSS feeds on a schedule and generates new topic suggestions using AI. Powered by node-cron via Next.js instrumentation hook.</p>

            <div className="space-y-2">
              {AUTOMATION_VARS.map((v) => (
                <div key={v.key} className="flex items-start gap-3 bg-gray-800/50 rounded-lg px-3 py-2">
                  <code className="text-purple-300 text-xs font-mono shrink-0 w-48">{v.key}</code>
                  <div>
                    <div className="text-gray-500 text-xs">{v.desc}</div>
                    <code className="text-gray-600 text-xs">Example: {v.example}</code>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-800 pt-3 space-y-2">
              <div className="text-xs font-medium text-gray-500">How It Works</div>
              <div className="space-y-1 text-xs text-gray-600">
                <div>1. <code className="text-purple-400">instrumentation.ts</code> → calls <code className="text-purple-400">startScheduler()</code> on server boot</div>
                <div>2. Scheduler seeds default feeds on first run if none exist</div>
                <div>3. Cron runs every N hours → fetches all active feeds → scores items</div>
                <div>4. High-scoring items appear in Memory → AI generates topic suggestions</div>
                <div>5. Topics show in <strong className="text-gray-400">New Video → From Memory</strong> tab</div>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-3">
            <div className="text-sm font-medium text-white">Manual Actions</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Fetch All RSS Feeds", endpoint: "/api/rss/fetch", method: "POST", body: { action: "fetch-all" }, icon: "📡" },
                { label: "Seed Default Feeds", endpoint: "/api/rss/fetch", method: "POST", body: { action: "seed" }, icon: "🌱" },
                { label: "Generate AI Topics", endpoint: "/api/rss/topics", method: "POST", body: {}, icon: "🧠" },
                { label: "Check Provider Status", endpoint: "/api/models/status", method: "GET", body: null, icon: "🔍" },
              ].map((action) => (
                <AutomationButton key={action.label} {...action} />
              ))}
            </div>
          </div>

          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-2">
            <div className="text-sm font-medium text-white">About AutoTube Factory</div>
            <p className="text-xs text-gray-500">Full-stack YouTube video automation — research, script, scenes, image prompts &amp; voiceover in one pipeline. Free-first architecture: all features work at $0.00 cost using free APIs.</p>
            <div className="flex flex-wrap gap-2 text-xs text-gray-600 pt-2">
              {["Next.js 15", "TypeScript", "Prisma v5", "SQLite", "Groq ⚡", "Google AI 🔵", "Ollama 🏠", "Pollinations 🌸", "Edge TTS 🎙️"].map((t) => (
                <span key={t} className="bg-gray-800/60 px-2 py-0.5 rounded-full">{t}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: Integrations ── */}
      {tab === "integrations" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-white">Integrations</h2>
            <p className="text-sm text-gray-500 mt-1">Connect AutoTube to external tools. All integrations fire automatically when a project finishes. You can also trigger them manually via the export endpoint.</p>
          </div>

          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl px-4 py-3 text-xs text-blue-300 space-y-1">
            <div className="font-medium">🔄 How integrations work</div>
            <div className="text-blue-400/80">On project completion → Airtable export → Notion page creation → Slack notification (in that order). Each is independent; failures are logged but don&apos;t affect the pipeline.</div>
            <div className="mt-1">
              <span className="text-blue-400 font-mono">POST /api/integrations/export?projectId=XXX</span>
              <span className="text-blue-500"> — manually trigger all three for any existing project</span>
            </div>
          </div>

          {INTEGRATIONS.map((intg) => (
            <IntegrationCard key={intg.id} integration={intg} />
          ))}
        </div>
      )}
    </div>
  );
}

function IntegrationCard({ integration }: { integration: typeof INTEGRATIONS[number] }) {
  const [open, setOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState("");
  const [projectId, setProjectId] = useState("");
  const [exporting, setExporting] = useState(false);
  const [exportResult, setExportResult] = useState("");

  async function runTest() {
    if (!integration.testEndpoint) return;
    setTesting(true);
    try {
      const r = await fetch(integration.testEndpoint);
      const data = await r.json();
      const status = data[integration.id];
      setTestResult(status?.available ? "✅ Available" : `❌ ${status?.reason ?? "Not configured"}`);
    } catch (e: unknown) {
      setTestResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setTesting(false);
  }

  async function runExport() {
    const id = projectId.trim();
    if (!id) { setExportResult("❌ Enter a project ID first"); return; }
    setExporting(true);
    setExportResult("");
    try {
      const r = await fetch(`/api/integrations/export?projectId=${encodeURIComponent(id)}`, { method: "POST" });
      const data = await r.json();
      const res = data.results?.[integration.id];
      setExportResult(res?.ok ? "✅ Exported successfully" : `❌ ${res?.error ?? "Failed"}`);
    } catch (e: unknown) {
      setExportResult(`❌ ${e instanceof Error ? e.message : "Error"}`);
    }
    setExporting(false);
  }

  return (
    <div className={`border rounded-2xl p-5 space-y-4 ${integration.colorClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{integration.icon}</span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{integration.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full border ${integration.badgeClass}`}>{integration.badge}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{integration.description}</div>
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          {integration.signupUrl && (
            <a href={integration.signupUrl} target="_blank" rel="noopener noreferrer"
              className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 rounded-lg bg-gray-800/60 border border-gray-700/40 transition-colors">
              Setup →
            </a>
          )}
        </div>
      </div>

      {/* Env Vars */}
      <div className="space-y-1.5">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">.env.local keys</div>
        {integration.envVars.map((v) => (
          <EnvVarRow key={v.key} envKey={v.key} desc={v.desc} secret={v.secret} example={v.example} />
        ))}
      </div>

      {/* Setup Steps Toggle */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1 transition-colors"
      >
        {open ? "▲" : "▼"} Setup instructions
      </button>
      {open && (
        <div className="bg-gray-900/60 rounded-xl p-4 space-y-1.5">
          {integration.setupSteps.map((step, i) => (
            <div key={i} className="text-xs text-gray-400">{step}</div>
          ))}
          {integration.docsUrl && (
            <a href={integration.docsUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 mt-1">
              View docs →
            </a>
          )}
        </div>
      )}

      {/* Test / Export row */}
      <div className="border-t border-gray-700/30 pt-3 space-y-3">
        {/* Manual export trigger */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Project ID to test export..."
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="flex-1 bg-gray-800/60 border border-gray-700/40 rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder-gray-600 outline-none focus:border-gray-500"
          />
          <button
            onClick={runExport}
            disabled={exporting}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded-lg transition-colors disabled:opacity-50 shrink-0"
          >
            {exporting ? "⟳ Exporting…" : `▶ Test ${integration.name}`}
          </button>
        </div>
        {exportResult && (
          <div className={`text-xs px-3 py-1.5 rounded-lg ${exportResult.startsWith("✅") ? "bg-green-900/20 text-green-400" : "bg-red-900/20 text-red-400"}`}>
            {exportResult}
          </div>
        )}

        {/* Provider status test (Perplexity only) */}
        {integration.testEndpoint && (
          <div className="flex items-center gap-3">
            <button
              onClick={runTest}
              disabled={testing}
              className="px-3 py-1.5 bg-teal-800/40 hover:bg-teal-700/50 text-teal-300 text-xs rounded-lg border border-teal-700/30 transition-colors disabled:opacity-50"
            >
              {testing ? "⟳ Checking…" : `🔍 ${integration.testLabel}`}
            </button>
            {testResult && (
              <span className={`text-xs ${testResult.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>{testResult}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AutomationButton({ label, endpoint, method, body, icon }: {
  label: string; endpoint: string; method: string; body: Record<string, unknown> | null; icon: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [result, setResult] = useState("");

  async function run() {
    setState("loading");
    try {
      const opts: RequestInit = { method };
      if (body && method !== "GET") {
        opts.headers = { "Content-Type": "application/json" };
        opts.body = JSON.stringify(body);
      }
      const r = await fetch(endpoint, opts);
      const data = await r.json();
      setResult(JSON.stringify(data).slice(0, 120));
      setState("done");
    } catch (e: unknown) {
      setResult(e instanceof Error ? e.message : "Error");
      setState("error");
    }
    setTimeout(() => setState("idle"), 4000);
  }

  return (
    <button
      onClick={run}
      disabled={state === "loading"}
      className="flex items-center gap-3 bg-gray-800/50 hover:bg-gray-800 border border-gray-700/50 rounded-xl p-3 text-left transition-colors disabled:opacity-50 w-full"
    >
      <span className="text-xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="text-white text-xs font-medium">{label}</div>
        {result && <div className="text-gray-600 text-xs mt-0.5 truncate">{result}</div>}
      </div>
      <span className="text-xs text-gray-600 shrink-0">
        {state === "loading" ? "⟳" : state === "done" ? "✓" : state === "error" ? "✗" : "▶"}
      </span>
    </button>
  );
}
