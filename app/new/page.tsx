"use client";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { DURATION_OPTIONS } from "@/lib/utils";
import { AVAILABLE_MODELS, ModelDefinition } from "@/lib/models";

const NICHES = ["Tech", "Finance", "Health", "Dropshipping", "Lifestyle", "Education", "Fitness", "Business", "Marketing", "Other"];
const STYLES = ["Informational", "Story-Based", "Tutorial", "Listicle", "Case Study", "Exposé"];
const TONES = ["Professional", "Casual", "Energetic", "Motivational", "Educational", "Controversial"];

const PROVIDER_INFO: Record<string, { label: string; icon: string; color: string }> = {
  groq:        { label: "Groq (Free ⚡)", icon: "⚡", color: "orange" },
  google:      { label: "Google AI (Free)", icon: "🔵", color: "blue" },
  openrouter:  { label: "OpenRouter (Free)", icon: "🌐", color: "purple" },
  ollama:      { label: "Ollama (Local)", icon: "🏠", color: "green" },
  cloudflare:  { label: "Cloudflare AI (Free)", icon: "☁️", color: "gray" },
  bedrock:     { label: "AWS Bedrock", icon: "🌩️", color: "amber" },
  perplexity:  { label: "Perplexity (Research AI)", icon: "🔍", color: "teal" },
};

export default function NewProjectPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64 text-gray-500">Loading...</div>}>
      <NewProjectForm />
    </Suspense>
  );
}

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"manual" | "memory">("manual");
  const [providerStatus, setProviderStatus] = useState<Record<string, { available: boolean; reason?: string }>>({});
  const [topicSuggestions, setTopicSuggestions] = useState<any[]>([]);
  const [loadingTopics, setLoadingTopics] = useState(false);

  const [form, setForm] = useState({
    title: searchParams.get("title") ?? "",
    niche: searchParams.get("niche") ?? "Tech",
    audience: "",
    duration: 5,
    style: "Informational",
    tone: "Professional",
    notes: "",
    modelId: "us.anthropic.claude-sonnet-4-6",
    sourceTopicId: searchParams.get("topicId") ?? "",
    researchModelId: "",
    scriptModelId: "",
    imagePromptModelId: "",
    exportToAirtable: false,
    exportToNotion: false,
  });
  const [advancedModels, setAdvancedModels] = useState(false);

  const selectedDuration = DURATION_OPTIONS.find((d) => d.value === form.duration)!;
  const selectedModel = AVAILABLE_MODELS.find((m) => m.id === form.modelId);

  useEffect(() => {
    fetch("/api/models/status").then((r) => r.json()).then(setProviderStatus).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === "memory") {
      setLoadingTopics(true);
      fetch("/api/rss/topics?status=pending")
        .then((r) => r.json())
        .then((d) => setTopicSuggestions(Array.isArray(d) ? d : []))
        .catch(() => setTopicSuggestions([]))
        .finally(() => setLoadingTopics(false));
    }
  }, [tab]);

  function set(key: string, val: string | number) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function pickTopic(t: any) {
    setForm((f) => ({
      ...f,
      title: t.title,
      niche: t.niche ?? f.niche,
      sourceTopicId: t.id,
    }));
    setTab("manual");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.audience.trim()) {
      setError("Title and Target Audience are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create project");
      router.push(`/project/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  const allProviders = ["groq", "google", "openrouter", "ollama", "cloudflare", "bedrock", "perplexity"] as const;
  const providerGroups = allProviders.map((p) => ({
    provider: p as string,
    info: PROVIDER_INFO[p],
    models: AVAILABLE_MODELS.filter((m) => m.provider === p),
    status: providerStatus[p],
  }));
  // Research providers include Perplexity (best for web-search research)
  const researchProviders = ["perplexity", "groq", "google", "openrouter", "bedrock"] as const;
  const researchGroups = researchProviders.map((p) => ({
    provider: p as string,
    info: PROVIDER_INFO[p],
    models: AVAILABLE_MODELS.filter((m) => m.provider === p),
    status: providerStatus[p],
  }));
  // Image prompt providers — prefer big context / strong visual models
  const imagePromptProviders = ["bedrock", "groq", "google", "openrouter"] as const;
  const imagePromptGroups = imagePromptProviders.map((p) => ({
    provider: p as string,
    info: PROVIDER_INFO[p],
    models: AVAILABLE_MODELS.filter((m) => m.provider === p),
    status: providerStatus[p],
  }));

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="space-y-2">
        <a href="/projects" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Back to Projects
        </a>
        <h1 className="text-3xl font-bold text-white">Create New Video</h1>
        <p className="text-gray-400">Fill in the details below and we&apos;ll generate your complete asset pack — research, script, scenes, image prompts &amp; voiceover.</p>
        <div className="flex items-center gap-3 text-xs text-gray-600 flex-wrap">
          <span>🆓 Works with free APIs</span>
          <span>·</span>
          <span>⏱️ ~60–90 seconds</span>
          <span>·</span>
          <span>📦 Downloads as ZIP</span>
        </div>
      </div>

      {/* Tab selector */}
      <div className="flex gap-2 border-b border-gray-800 pb-0">
        {[{ id: "manual", label: "✏️ Manual Topic" }, { id: "memory", label: "🧠 From Memory" }].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 transition-colors ${
              tab === t.id
                ? "border-purple-500 text-purple-400 bg-purple-900/20"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Memory tab */}
      {tab === "memory" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-gray-400 text-sm">AI-discovered topics from your RSS feeds</p>
            <button
              onClick={async () => {
                setLoadingTopics(true);
                await fetch("/api/rss/topics", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
                const d = await fetch("/api/rss/topics?status=pending").then((r) => r.json());
                setTopicSuggestions(Array.isArray(d) ? d : []);
                setLoadingTopics(false);
              }}
              className="text-xs bg-purple-600/20 border border-purple-700 text-purple-300 px-3 py-1.5 rounded-lg hover:bg-purple-600/30 transition-colors"
            >
              {loadingTopics ? "Generating..." : "✨ Generate Topics"}
            </button>
          </div>

          {loadingTopics ? (
            <div className="text-center py-12 text-gray-500">Analyzing RSS feeds...</div>
          ) : topicSuggestions.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 rounded-2xl border border-gray-800">
              <div className="text-4xl mb-3">🧠</div>
              <p className="text-gray-400">No topic suggestions yet.</p>
              <p className="text-gray-600 text-sm mt-1">First fetch RSS feeds from the Memory page, then click "Generate Topics".</p>
              <a href="/memory" className="inline-block mt-4 text-purple-400 text-sm hover:underline">→ Go to Memory page</a>
            </div>
          ) : (
            <div className="space-y-3">
              {topicSuggestions.map((t) => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-purple-700 transition-colors cursor-pointer group" onClick={() => pickTopic(t)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white group-hover:text-purple-300 transition-colors">{t.title}</div>
                      <div className="text-sm text-gray-500 mt-1">{t.niche} · {t.angle}</div>
                      {t.whyNow && <div className="text-xs text-gray-600 mt-1 italic">"{t.whyNow}"</div>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        t.score >= 80 ? "bg-green-900/40 text-green-400" :
                        t.score >= 60 ? "bg-yellow-900/40 text-yellow-400" : "bg-gray-800 text-gray-400"
                      }`}>{t.score}/100</div>
                      <button className="text-xs bg-purple-600 text-white px-3 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">Use →</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Manual form */}
      {tab === "manual" && (
        <form onSubmit={handleSubmit} className="space-y-6">
          {form.sourceTopicId && (
            <div className="bg-purple-900/20 border border-purple-700/50 rounded-xl p-3 flex items-center justify-between text-sm">
              <span className="text-purple-300">📌 Using topic from Memory</span>
              <button type="button" onClick={() => set("sourceTopicId", "")} className="text-gray-500 hover:text-gray-300 text-xs">Clear</button>
            </div>
          )}

          {/* Title */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Video Topic / Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. How to Start Dropshipping with Zero Money in 2025"
              className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors text-lg"
              required
            />
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">
              🎯 Target Duration <span className="text-red-400">*</span>
              <span className="text-gray-500 font-normal ml-2">— 12 image prompts per minute</span>
            </label>
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-7">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => set("duration", d.value)}
                  className={`rounded-xl p-3 border text-center transition-all ${
                    form.duration === d.value
                      ? "border-purple-500 bg-purple-600/20 text-white"
                      : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500"
                  }`}
                >
                  <div className="font-bold text-base">{d.label}</div>
                  <div className="text-xs mt-1 opacity-70">{d.prompts} prompts</div>
                  <div className="text-xs opacity-50">~{d.words}w</div>
                </button>
              ))}
            </div>
            <div className="bg-purple-900/20 border border-purple-800/40 rounded-xl p-4 flex items-center gap-4">
              <div className="text-4xl font-bold text-purple-400">{selectedDuration.prompts}</div>
              <div>
                <div className="text-white font-medium">Image Prompts will be generated</div>
                <div className="text-gray-400 text-sm">~{selectedDuration.words} words · {selectedDuration.value} min × 12 prompts/min</div>
              </div>
            </div>
          </div>

          {/* Niche + Audience */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Niche</label>
              <select value={form.niche} onChange={(e) => set("niche", e.target.value)} className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white outline-none transition-colors">
                {NICHES.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Target Audience <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={form.audience}
                onChange={(e) => set("audience", e.target.value)}
                placeholder="e.g. Beginners aged 18-30"
                className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors"
                required
              />
            </div>
          </div>

          {/* Style + Tone */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Video Style</label>
              <select value={form.style} onChange={(e) => set("style", e.target.value)} className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white outline-none transition-colors">
                {STYLES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Tone</label>
              <select value={form.tone} onChange={(e) => set("tone", e.target.value)} className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white outline-none transition-colors">
                {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-gray-300">🤖 AI Model</label>
              <button
                type="button"
                onClick={() => setAdvancedModels((v) => !v)}
                className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
              >
                {advancedModels ? "▲ Simple" : "▼ Advanced / Per-step"}
              </button>
            </div>

            {/* Simple preset picker (default) */}
            {!advancedModels && (
              <div className="space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {[
                    { id: "groq/llama-3.3-70b-versatile", label: "⚡ Groq Llama 3.3 70B", sub: "Free · Fastest", badge: "Recommended" },
                    { id: "google/gemini-2.0-flash-exp", label: "🔵 Google Gemini 2.0 Flash", sub: "Free · Smart", badge: null },
                    { id: "us.anthropic.claude-sonnet-4-6", label: "☁️ Claude Sonnet 4.5", sub: "AWS Bedrock", badge: null },
                    { id: "openrouter/deepseek/deepseek-r1:free", label: "🌐 DeepSeek R1", sub: "Free via OpenRouter", badge: null },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set("modelId", opt.id)}
                      className={`flex items-start justify-between gap-2 px-4 py-3 rounded-xl border text-left transition-all ${
                        form.modelId === opt.id
                          ? "border-purple-500 bg-purple-600/20 text-white"
                          : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500 hover:bg-gray-800/60"
                      }`}
                    >
                      <div>
                        <div className="text-sm font-medium">{opt.label}</div>
                        <div className="text-xs text-gray-500 mt-0.5">{opt.sub}</div>
                      </div>
                      {opt.badge && (
                        <span className="text-xs bg-green-900/40 text-green-400 border border-green-800/40 px-1.5 py-0.5 rounded-full shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600">
                  Don&apos;t have API keys yet?{" "}
                  <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Get Groq free</a>
                  {" "}or{" "}
                  <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:underline">Google AI free</a>
                  {" "}· <a href="/settings" className="text-gray-500 hover:text-gray-400">Configure in Settings →</a>
                </p>
              </div>
            )}

            {/* Advanced full model picker */}
            {advancedModels && (
              <ModelPicker
                groups={providerGroups}
                selected={form.modelId}
                onSelect={(id) => set("modelId", id)}
              />
            )}

            {selectedModel && (
              <div className="text-xs text-gray-600 flex items-center gap-2 flex-wrap">
                <span>Selected: <span className="text-gray-400">{selectedModel.name}</span></span>
                <span>·</span>
                <span>{selectedModel.contextWindow ? `${(selectedModel.contextWindow / 1000).toFixed(0)}k ctx` : ""}</span>
                <span>·</span>
                <span className={selectedModel.costPer1kTokens === 0 ? "text-green-400" : "text-gray-500"}>
                  {selectedModel.costPer1kTokens === 0 ? "🆓 Free" : `$${selectedModel.costPer1kTokens}/1k tokens`}
                </span>
              </div>
            )}
          </div>

          {/* Per-step model overrides */}
          {advancedModels && (
            <div className="space-y-5 bg-gray-900/50 border border-gray-800 rounded-2xl p-5">
              <p className="text-sm text-gray-400">Override the model used for each pipeline step. Leave blank to use the default model above.</p>

              {/* Research Model */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-blue-400">
                  🔬 Research Model
                  <span className="text-gray-500 font-normal ml-2">— Best: Perplexity (real-time web search)</span>
                  {form.researchModelId && (
                    <button type="button" onClick={() => set("researchModelId", "")} className="ml-2 text-xs text-gray-600 hover:text-red-400">✕ clear</button>
                  )}
                </label>
                <ModelPicker
                  groups={researchGroups}
                  selected={form.researchModelId || form.modelId}
                  isOverride={!!form.researchModelId}
                  onSelect={(id) => set("researchModelId", id === form.modelId ? "" : id)}
                />
              </div>

              {/* Script Model */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-green-400">
                  ✍️ Script Model
                  <span className="text-gray-500 font-normal ml-2">— Best: Claude Sonnet / GPT-4 class</span>
                  {form.scriptModelId && (
                    <button type="button" onClick={() => set("scriptModelId", "")} className="ml-2 text-xs text-gray-600 hover:text-red-400">✕ clear</button>
                  )}
                </label>
                <ModelPicker
                  groups={providerGroups}
                  selected={form.scriptModelId || form.modelId}
                  isOverride={!!form.scriptModelId}
                  onSelect={(id) => set("scriptModelId", id === form.modelId ? "" : id)}
                />
              </div>

              {/* Image Prompt Model */}
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-orange-400">
                  🎨 Image Prompt Model
                  <span className="text-gray-500 font-normal ml-2">— Best: Amazon Nova Pro (visual descriptions)</span>
                  {form.imagePromptModelId && (
                    <button type="button" onClick={() => set("imagePromptModelId", "")} className="ml-2 text-xs text-gray-600 hover:text-red-400">✕ clear</button>
                  )}
                </label>
                <ModelPicker
                  groups={imagePromptGroups}
                  selected={form.imagePromptModelId || form.modelId}
                  isOverride={!!form.imagePromptModelId}
                  onSelect={(id) => set("imagePromptModelId", id === form.modelId ? "" : id)}
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Additional Notes <span className="text-gray-600">(optional)</span></label>
            <textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Any special instructions, angles, or requirements..."
              rows={3}
              className="w-full bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-3 text-white placeholder-gray-600 outline-none transition-colors resize-none"
            />
          </div>

          {/* ── Export Options ── */}
          <div className="bg-gray-900 border border-gray-700/60 rounded-xl p-4 space-y-3">
            <div className="text-sm font-medium text-gray-300">📤 Export &amp; Notifications</div>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.exportToAirtable}
                  onChange={(e) => setForm((f) => ({ ...f, exportToAirtable: e.target.checked }))}
                  className="w-4 h-4 rounded accent-green-500"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                  <span className="text-green-400">📊 Export to Airtable</span>
                  <span className="text-gray-600 ml-2 text-xs">— log run data, titles, prompts &amp; assets</span>
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={form.exportToNotion}
                  onChange={(e) => setForm((f) => ({ ...f, exportToNotion: e.target.checked }))}
                  className="w-4 h-4 rounded accent-gray-300"
                />
                <span className="text-sm text-gray-400 group-hover:text-gray-200 transition-colors">
                  <span className="text-white">📝 Create Notion Page</span>
                  <span className="text-gray-600 ml-2 text-xs">— structured page with script, research &amp; metadata</span>
                </span>
              </label>
              <div className="flex items-center gap-3 pl-1 pt-1">
                <span className="text-xs text-gray-600">💬 Slack notification sends automatically on every completed run</span>
              </div>
            </div>
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-xl p-4 text-red-300 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-500 disabled:bg-purple-800 disabled:cursor-not-allowed text-white py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-purple-900/30"
          >
            {loading ? "🔄 Creating Project & Starting Generation..." : `🚀 Generate Asset Pack (${selectedDuration.prompts} Image Prompts)`}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── Reusable ModelPicker ─────────────────────────────────────────────────────

function ModelPicker({
  groups,
  selected,
  onSelect,
  isOverride = false,
}: {
  groups: { provider: string; info: { label: string; icon: string; color: string }; models: ModelDefinition[]; status?: { available: boolean; reason?: string } }[];
  selected: string;
  onSelect: (id: string) => void;
  isOverride?: boolean;
}) {
  return (
    <div className={`space-y-2 ${isOverride ? "ring-1 ring-purple-700/40 rounded-xl p-2" : ""}`}>
      {groups.filter((g) => g.models.length > 0).map(({ provider, info, models, status }) => (
        <div key={provider} className="border border-gray-800 rounded-xl overflow-hidden">
          <div className={`flex items-center justify-between px-3 py-1.5 bg-gray-900/60 ${!status?.available ? "opacity-60" : ""}`}>
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-400">
              <span>{info.icon}</span>
              <span>{info.label}</span>
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full ${status?.available ? "bg-green-900/40 text-green-400" : "bg-red-900/30 text-red-400"}`}>
              {status?.available ? "✓ Ready" : status?.reason ? "✗ " + status.reason.split(" ").slice(0, 3).join(" ") + "..." : "Checking..."}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-gray-800/50">
            {models.map((m) => (
              <button
                key={m.id}
                type="button"
                disabled={!status?.available}
                onClick={() => onSelect(m.id)}
                className={`text-left p-2.5 transition-colors ${
                  selected === m.id
                    ? "bg-purple-900/30 border border-purple-600"
                    : "bg-gray-900/40 hover:bg-gray-800/60"
                } ${!status?.available ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="font-medium text-xs text-white">{m.name}</span>
                  <div className="flex gap-1 shrink-0">
                    {m.recommended && <span className="text-xs bg-purple-900/60 text-purple-300 px-1 py-0.5 rounded-full">★</span>}
                    {m.costPer1kTokens === 0 && <span className="text-xs bg-green-900/40 text-green-400 px-1 py-0.5 rounded-full">Free</span>}
                  </div>
                </div>
                <div className="text-xs text-gray-600 mt-0.5 leading-tight">{m.description}</div>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
