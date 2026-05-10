"use client";
import { useEffect, useState } from "react";
import { formatTime } from "@/lib/utils";

interface Segment {
  text: string;
  timeStart: number;
  timeEnd: number;
}

interface Voiceover {
  id: string;
  fullText: string;
  segments: string;
  wordCount: number;
  estimatedDuration: number;
  updatedAt: string;
}

interface TTSResult {
  path?: string;
  voice?: string;
  engine?: string;
  error?: string;
}

const TTS_ENGINES = [
  {
    id: "edge",
    label: "🔵 Edge TTS",
    description: "Free, no key, 300+ voices",
    apiPath: "/api/tts/edge",
    voices: [
      { value: "en-US-AriaNeural", label: "Aria (US, Female)" },
      { value: "en-US-GuyNeural", label: "Guy (US, Male)" },
      { value: "en-US-JennyNeural", label: "Jenny (US, Female)" },
      { value: "en-US-ChristopherNeural", label: "Christopher (US, Male)" },
      { value: "en-GB-SoniaNeural", label: "Sonia (UK, Female)" },
      { value: "en-GB-RyanNeural", label: "Ryan (UK, Male)" },
      { value: "en-AU-NatashaNeural", label: "Natasha (AU, Female)" },
      { value: "en-AU-WilliamNeural", label: "William (AU, Male)" },
    ],
    langField: "voice",
    requiresPython: true,
    installCmd: "pip install edge-tts",
  },
  {
    id: "gtts",
    label: "🟢 gTTS",
    description: "Free Google TTS, Python",
    apiPath: "/api/tts/gtts",
    voices: [
      { value: "en", label: "English (US)" },
      { value: "en-uk", label: "English (UK)" },
      { value: "en-au", label: "English (AU)" },
    ],
    langField: "lang",
    requiresPython: true,
    installCmd: "pip install gtts",
  },
];

export default function VoiceoverTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Voiceover | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // TTS state
  const [selectedEngine, setSelectedEngine] = useState("edge");
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [ttsGenerating, setTtsGenerating] = useState(false);
  const [ttsResult, setTtsResult] = useState<TTSResult | null>(null);
  const [ttsError, setTtsError] = useState<string | null>(null);
  const [showTtsPanel, setShowTtsPanel] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/voiceover`);
      if (r.ok) setData(await r.json());
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [projectId]);

  async function regenerate() {
    setRegen(true);
    await fetch(`/api/projects/${projectId}/voiceover`, { method: "POST" });
    await load();
    setRegen(false);
  }

  async function saveEdit() {
    if (!data) return;
    setSaving(true);
    const r = await fetch(`/api/projects/${projectId}/voiceover`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullText: editText }),
    });
    if (r.ok) setData(await r.json());
    setSaving(false);
    setEditing(false);
  }

  function download() {
    if (!data) return;
    const blob = new Blob([data.fullText], { type: "text/plain" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "voiceover.txt"; a.click();
  }

  const engine = TTS_ENGINES.find((e) => e.id === selectedEngine) ?? TTS_ENGINES[0];

  // Reset voice when engine changes
  function handleEngineChange(engineId: string) {
    setSelectedEngine(engineId);
    const eng = TTS_ENGINES.find((e) => e.id === engineId);
    if (eng) setSelectedVoice(eng.voices[0].value);
    setTtsResult(null);
    setTtsError(null);
  }

  async function generateTTS() {
    if (!data) return;
    setTtsGenerating(true);
    setTtsResult(null);
    setTtsError(null);

    // Truncate text to 5000 chars for TTS (large texts take too long)
    const text = data.fullText.slice(0, 5000);

    try {
      const body: Record<string, string> = { text };
      if (engine.langField === "voice") body.voice = selectedVoice;
      else body.lang = selectedVoice;

      const r = await fetch(engine.apiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await r.json();
      if (r.ok) {
        setTtsResult(result);
      } else {
        setTtsError(result.error ?? result.message ?? "TTS generation failed");
      }
    } catch (e: unknown) {
      setTtsError(e instanceof Error ? e.message : "Network error");
    } finally {
      setTtsGenerating(false);
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading voiceover...</div>;
  if (!data) return (
    <div className="text-center py-12">
      <p className="text-gray-500 mb-4">No voiceover yet.</p>
      <button onClick={regenerate} className="bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm transition-colors">
        🎙️ Generate Voiceover
      </button>
    </div>
  );

  const segments: Segment[] = (() => { try { return JSON.parse(data.segments); } catch { return []; } })();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="bg-blue-900/30 text-blue-300 px-3 py-1 rounded-full text-sm">{data.wordCount} words</span>
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">~{Math.round(data.estimatedDuration / 60)} min</span>
          <span className="bg-gray-800 text-gray-300 px-3 py-1 rounded-full text-sm">{segments.length} segments</span>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => { navigator.clipboard.writeText(data.fullText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors"
          >
            {copied ? "✓ Copied" : "📋 Copy All"}
          </button>
          <button onClick={download} className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors">
            ⬇ Download .txt
          </button>
          {!editing && (
            <button onClick={() => { setEditing(true); setEditText(data.fullText); }}
              className="text-sm bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-2 rounded-lg transition-colors">
              ✏️ Edit
            </button>
          )}
          <button onClick={regenerate} disabled={regen} className="text-sm bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-300 px-3 py-2 rounded-lg transition-colors">
            {regen ? "⟳ Regen..." : "🔄 Regenerate"}
          </button>
        </div>
      </div>

      {/* Free TTS Panel */}
      <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-800/40 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-white text-sm font-medium">🎙️ Generate Audio (Free)</div>
            <div className="text-gray-400 text-xs">Edge TTS &amp; gTTS are 100% free — just need Python installed</div>
          </div>
          <button
            onClick={() => setShowTtsPanel((v) => !v)}
            className="text-xs bg-blue-800/40 hover:bg-blue-800/70 text-blue-300 px-3 py-1.5 rounded-lg transition-colors"
          >
            {showTtsPanel ? "▲ Hide" : "▼ Show TTS"}
          </button>
        </div>

        {showTtsPanel && (
          <div className="space-y-3 pt-1">
            {/* Engine selector */}
            <div className="flex flex-wrap gap-2">
              {TTS_ENGINES.map((e) => (
                <button
                  key={e.id}
                  onClick={() => handleEngineChange(e.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
                    selectedEngine === e.id
                      ? "bg-blue-600/30 border-blue-500 text-white"
                      : "bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  <span>{e.label}</span>
                  <span className="text-gray-500">{e.description}</span>
                </button>
              ))}
            </div>

            {/* Voice selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <label className="text-xs text-gray-500 shrink-0">Voice:</label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none flex-1 min-w-[200px]"
              >
                {engine.voices.map((v) => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>

              <button
                onClick={generateTTS}
                disabled={ttsGenerating}
                className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-1.5 rounded-lg text-xs font-medium transition-colors"
              >
                {ttsGenerating ? "⟳ Generating..." : "🎙️ Generate Audio"}
              </button>
            </div>

            {/* Result */}
            {ttsResult?.path && (
              <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-green-400 text-xs font-medium">✓ Audio generated!</span>
                  <span className="text-gray-500 text-xs">{ttsResult.engine} · {ttsResult.voice}</span>
                </div>
                <audio controls src={ttsResult.path} className="w-full h-8" />
                <div className="flex gap-2">
                  <a
                    href={ttsResult.path}
                    download
                    className="text-xs bg-green-800/40 hover:bg-green-800/70 text-green-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ⬇ Download MP3
                  </a>
                  <button
                    onClick={() => navigator.clipboard.writeText(window.location.origin + ttsResult.path!)}
                    className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    📋 Copy URL
                  </button>
                </div>
                <p className="text-xs text-gray-600">
                  Note: First 5,000 characters generated. For full audio, split text into segments and generate each.
                </p>
              </div>
            )}

            {ttsError && (
              <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 space-y-2">
                <div className="text-red-400 text-xs font-medium">⚠️ TTS Error</div>
                <div className="text-red-300 text-xs">{ttsError}</div>
                {ttsError.includes("not installed") || ttsError.includes("ENOENT") || ttsError.includes("python") ? (
                  <div className="bg-gray-900/60 rounded p-2 space-y-1">
                    <div className="text-xs text-gray-400">Install {engine.label}:</div>
                    <code className="text-xs text-green-400">{engine.installCmd}</code>
                    <button
                      onClick={() => navigator.clipboard.writeText(engine.installCmd)}
                      className="text-xs text-gray-600 hover:text-gray-400 ml-2"
                    >
                      📋
                    </button>
                  </div>
                ) : null}
              </div>
            )}

            {/* Install tip */}
            {!ttsResult && !ttsError && (
              <div className="text-xs text-gray-600">
                Requires Python: <code className="text-purple-400">{engine.installCmd}</code>
                <button
                  onClick={() => navigator.clipboard.writeText(engine.installCmd)}
                  className="ml-1 text-gray-600 hover:text-gray-400"
                >
                  📋
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full Text */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold text-white mb-3">Full Voiceover Text</h3>
        {editing ? (
          <div className="space-y-3">
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              rows={16}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none resize-none focus:border-purple-500"
            />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm transition-colors">
                {saving ? "Saving..." : "Save"}
              </button>
              <button onClick={() => setEditing(false)} className="bg-gray-700 hover:bg-gray-600 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">{data.fullText}</p>
        )}
      </div>

      {/* Segments */}
      {segments.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white">Timed Segments ({segments.length})</h3>
            <span className="text-xs text-gray-500">Each segment can be fed to TTS independently for precise audio sync</span>
          </div>
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-3 bg-gray-800/50 rounded-lg px-3 py-2 group">
                <span className="text-xs text-purple-400 font-mono whitespace-nowrap shrink-0 pt-0.5">
                  {formatTime(seg.timeStart)}–{formatTime(seg.timeEnd)}
                </span>
                <span className="text-gray-300 text-sm leading-relaxed flex-1">{seg.text}</span>
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => navigator.clipboard.writeText(seg.text)}
                    className="text-gray-600 hover:text-gray-400 text-xs pt-0.5"
                    title="Copy segment"
                  >
                    📋
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
