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
  audioUrl?: string;
  audioEngine?: string;
  audioVoice?: string;
  audioGeneratedAt?: string;
  updatedAt: string;
}

interface TTSResult {
  path?: string;
  audioUrl?: string;
  voice?: string;
  engine?: string;
  chunks?: number;
  totalChars?: number;
  fileSizeBytes?: number;
  error?: string;
}

const VOICES = [
  { value: "en-US-AriaNeural",        label: "Aria — US Female (Natural)" },
  { value: "en-US-GuyNeural",         label: "Guy — US Male" },
  { value: "en-US-JennyNeural",       label: "Jenny — US Female (Friendly)" },
  { value: "en-US-ChristopherNeural", label: "Christopher — US Male (Professional)" },
  { value: "en-US-TonyNeural",        label: "Tony — US Male (Confident)" },
  { value: "en-US-SaraNeural",        label: "Sara — US Female (Professional)" },
  { value: "en-GB-SoniaNeural",       label: "Sonia — British Female" },
  { value: "en-GB-RyanNeural",        label: "Ryan — British Male" },
  { value: "en-AU-NatashaNeural",     label: "Natasha — Australian Female" },
  { value: "en-AU-WilliamNeural",     label: "William — Australian Male" },
  { value: "en-IN-NeerjaNeural",      label: "Neerja — Indian English Female" },
];

export default function VoiceoverTab({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Voiceover | null>(null);
  const [loading, setLoading] = useState(true);
  const [regen, setRegen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Full-audio TTS
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [generating, setGenerating] = useState(false);
  const [genResult, setGenResult] = useState<TTSResult | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [genProgress, setGenProgress] = useState<string | null>(null);

  // Quick preview TTS (first 5000 chars)
  const [previewGenerating, setPreviewGenerating] = useState(false);
  const [previewResult, setPreviewResult] = useState<TTSResult | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);

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

  // ── Full audio generation (chunked) ────────────────────────────────────────
  async function generateFullAudio() {
    if (!data) return;
    setGenerating(true);
    setGenResult(null);
    setGenError(null);

    const chars = data.fullText.length;
    const estChunks = Math.ceil(chars / 3500);
    setGenProgress(`Preparing ${estChunks} chunk${estChunks > 1 ? "s" : ""} (~${Math.round(chars / 1000)}k chars)…`);

    try {
      const r = await fetch("/api/tts/generate-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, voice: selectedVoice, engine: "edge" }),
      });
      const result = await r.json();
      if (r.ok) {
        setGenResult(result);
        // Reload voiceover to get saved audioUrl from DB
        await load();
      } else {
        setGenError(result.error ?? "Full audio generation failed");
      }
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Network error");
    } finally {
      setGenerating(false);
      setGenProgress(null);
    }
  }

  // ── Quick preview (first 4000 chars via /api/tts/edge) ─────────────────────
  async function generatePreview() {
    if (!data) return;
    setPreviewGenerating(true);
    setPreviewResult(null);
    setPreviewError(null);
    try {
      const r = await fetch("/api/tts/edge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: data.fullText.slice(0, 4000), voice: selectedVoice }),
      });
      const result = await r.json();
      if (r.ok) setPreviewResult(result);
      else setPreviewError(result.error ?? "Preview generation failed");
    } catch (e) {
      setPreviewError(e instanceof Error ? e.message : "Network error");
    } finally {
      setPreviewGenerating(false);
    }
  }

  if (loading) return <div className="text-gray-500 py-12 text-center">Loading voiceover…</div>;

  if (!data) return (
    <div className="text-center py-16 space-y-4">
      <div className="text-4xl">🎙️</div>
      <p className="text-gray-500">No voiceover script yet.</p>
      <button
        onClick={regenerate}
        className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
      >
        Generate Voiceover Script
      </button>
    </div>
  );

  const segments: Segment[] = (() => { try { return JSON.parse(data.segments); } catch { return []; } })();
  const estMinutes = Math.round(data.estimatedDuration / 60);
  const savedAudioUrl = data.audioUrl;

  return (
    <div className="space-y-5">

      {/* ── Stats bar ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="bg-blue-900/30 border border-blue-800/30 text-blue-300 px-3 py-1 rounded-full text-xs">{data.wordCount.toLocaleString()} words</span>
        <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs">~{estMinutes} min read</span>
        <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs">{segments.length} segments</span>
        <span className="bg-gray-800 text-gray-400 px-3 py-1 rounded-full text-xs">{data.fullText.length.toLocaleString()} chars</span>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button
            onClick={() => { navigator.clipboard.writeText(data.fullText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
            className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg transition-colors"
          >
            {copied ? "✓ Copied" : "📋 Copy"}
          </button>
          <button onClick={download} className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg transition-colors">
            ⬇ .txt
          </button>
          {!editing && (
            <button onClick={() => { setEditing(true); setEditText(data.fullText); }}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-400 px-3 py-1.5 rounded-lg transition-colors">
              ✏️ Edit
            </button>
          )}
          <button onClick={regenerate} disabled={regen} className="text-xs bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-gray-400 px-3 py-1.5 rounded-lg transition-colors">
            {regen ? "⟳…" : "🔄 Regen"}
          </button>
        </div>
      </div>

      {/* ── Saved Audio Player ── */}
      {savedAudioUrl && (
        <div className="bg-green-900/15 border border-green-800/40 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <div className="text-green-400 text-sm font-medium">✅ Full Audio Generated</div>
              <div className="text-gray-500 text-xs mt-0.5">
                {data.audioVoice} · {data.audioEngine}
                {data.audioGeneratedAt && ` · ${new Date(data.audioGeneratedAt).toLocaleDateString()}`}
              </div>
            </div>
            <a
              href={savedAudioUrl}
              download
              className="text-xs bg-green-800/40 hover:bg-green-800/70 text-green-300 px-3 py-1.5 rounded-lg transition-colors"
            >
              ⬇ Download MP3
            </a>
          </div>
          <audio controls src={savedAudioUrl} className="w-full" style={{ height: 40 }} />
        </div>
      )}

      {/* ── Audio Generation Panel ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-white text-sm">🎙️ Generate Full Audio (Free)</h3>
          <p className="text-xs text-gray-500 mt-1">
            Uses Microsoft Edge TTS (free, no API key). Splits long scripts into chunks and merges into one MP3.
          </p>
        </div>

        {/* Voice picker */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="text-xs text-gray-500 shrink-0">Voice:</label>
          <select
            value={selectedVoice}
            onChange={(e) => setSelectedVoice(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none flex-1 min-w-[220px] focus:border-purple-500"
          >
            {VOICES.map((v) => (
              <option key={v.value} value={v.value}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={generateFullAudio}
            disabled={generating || previewGenerating}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors"
          >
            {generating ? (
              <><span className="animate-spin">⟳</span> Generating full audio…</>
            ) : (
              <>🎙️ Generate Full MP3 ({Math.ceil(data.fullText.length / 3500)} chunks)</>
            )}
          </button>
          <button
            onClick={generatePreview}
            disabled={previewGenerating || generating}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {previewGenerating ? "⟳ Generating…" : "▶ Quick Preview (first 4k chars)"}
          </button>
        </div>

        {/* Progress */}
        {genProgress && (
          <div className="text-xs text-yellow-400 bg-yellow-900/20 border border-yellow-800/30 rounded-lg px-3 py-2 flex items-center gap-2">
            <span className="animate-spin">⟳</span> {genProgress}
            <span className="text-gray-500 ml-1">— This may take 1–3 min for long scripts…</span>
          </div>
        )}

        {/* Full audio success */}
        {genResult?.audioUrl && (
          <div className="bg-green-900/20 border border-green-800/40 rounded-lg p-3 space-y-2">
            <div className="text-green-400 text-xs font-medium">
              ✅ Full audio generated — {genResult.chunks} chunks, {Math.round((genResult.fileSizeBytes ?? 0) / 1024)}KB
            </div>
            <audio controls src={genResult.audioUrl} className="w-full" style={{ height: 40 }} />
            <a href={genResult.audioUrl} download className="inline-flex items-center gap-1 text-xs bg-green-800/40 hover:bg-green-800/70 text-green-300 px-3 py-1.5 rounded-lg transition-colors">
              ⬇ Download Full MP3
            </a>
          </div>
        )}

        {/* Full audio error */}
        {genError && (
          <div className="bg-red-900/20 border border-red-800/40 rounded-lg p-3 space-y-1">
            <div className="text-red-400 text-xs font-medium">❌ Error</div>
            <div className="text-red-300 text-xs">{genError}</div>
            {(genError.includes("not installed") || genError.includes("Python")) && (
              <div className="text-yellow-300 text-xs bg-yellow-900/20 rounded p-2 mt-1">
                💡 Install edge-tts: <code className="text-green-400">pip install edge-tts</code>
                {" "}<button onClick={() => navigator.clipboard.writeText("pip install edge-tts")} className="text-gray-500 hover:text-gray-300 ml-1">📋</button>
              </div>
            )}
          </div>
        )}

        {/* Preview success */}
        {previewResult?.path && (
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-lg p-3 space-y-2">
            <div className="text-gray-300 text-xs">▶ Preview (first 4k chars) — {previewResult.voice}</div>
            <audio controls src={previewResult.path} className="w-full" style={{ height: 36 }} />
          </div>
        )}

        {/* Preview error */}
        {previewError && (
          <div className="text-red-400 text-xs bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">❌ {previewError}</div>
        )}

        <p className="text-xs text-gray-600">
          Requires Python + edge-tts: <code className="text-purple-400">pip install edge-tts</code>
          {" · "}Audio is saved to project and available in the Export tab ZIP.
        </p>
      </div>

      {/* ── Full Text ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-white text-sm">Full Voiceover Script</h3>
          <span className="text-xs text-gray-600">{data.fullText.length.toLocaleString()} chars</span>
        </div>
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
                {saving ? "Saving…" : "Save"}
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

      {/* ── Timed Segments ── */}
      {segments.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">Timed Segments ({segments.length})</h3>
            <span className="text-xs text-gray-600">Used for subtitle sync and scene timing</span>
          </div>
          <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {segments.map((seg, i) => (
              <div key={i} className="flex gap-3 bg-gray-800/50 rounded-lg px-3 py-2 group hover:bg-gray-800/80 transition-colors">
                <span className="text-xs text-purple-400 font-mono whitespace-nowrap shrink-0 pt-0.5 w-24">
                  {formatTime(seg.timeStart)}–{formatTime(seg.timeEnd)}
                </span>
                <span className="text-gray-300 text-sm leading-relaxed flex-1">{seg.text}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(seg.text)}
                  className="text-gray-600 hover:text-gray-400 text-xs shrink-0 opacity-0 group-hover:opacity-100 transition-opacity pt-0.5"
                  title="Copy segment"
                >
                  📋
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
