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

const ENGINES = [
  // ── Built-in free (pre-installed in Docker) ─────────────────────────────────
  { value: "edge",    label: "🆓 Edge TTS — Microsoft Neural (built-in, recommended)", group: "Built-in Free" },
  { value: "gtts",    label: "🆓 gTTS — Google TTS (built-in, needs internet)",        group: "Built-in Free" },
  // ── Local TTS servers (run on your machine / host) ──────────────────────────
  { value: "kokoro",  label: "🆓 Kokoro TTS — localhost:8880 (best free quality)",     group: "Local Server" },
  { value: "alltalk", label: "🆓 AllTalk TTS — localhost:7851",                         group: "Local Server" },
  { value: "fish",    label: "🆓 Fish Speech — localhost:8080",                         group: "Local Server" },
  // ── Paid API ─────────────────────────────────────────────────────────────────
  { value: "openai",  label: "💰 OpenAI TTS — ~$15/1M chars (needs API key)",          group: "Paid API" },
];

const LOCAL_SERVER_PORTS: Record<string, string> = {
  kokoro:  "8880",
  alltalk: "7851",
  fish:    "8080",
};

// Edge TTS voices (used when engine = "edge")
const EDGE_VOICES = [
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

// gTTS lang codes
const GTTS_LANGS = [
  { value: "en",    label: "English (en)" },
  { value: "en-uk", label: "English UK (en-uk)" },
  { value: "en-au", label: "English AU (en-au)" },
  { value: "es",    label: "Spanish (es)" },
  { value: "fr",    label: "French (fr)" },
  { value: "de",    label: "German (de)" },
  { value: "hi",    label: "Hindi (hi)" },
];

// OpenAI voices
const OPENAI_VOICES = [
  { value: "nova",    label: "Nova — Female (Warm)" },
  { value: "alloy",   label: "Alloy — Neutral" },
  { value: "echo",    label: "Echo — Male" },
  { value: "fable",   label: "Fable — British Male" },
  { value: "onyx",    label: "Onyx — Male (Deep)" },
  { value: "shimmer", label: "Shimmer — Female (Soft)" },
];

// Kokoro voices
const KOKORO_VOICES = [
  { value: "af_bella",  label: "Bella — Female (American)" },
  { value: "af_sarah",  label: "Sarah — Female (American)" },
  { value: "af_sky",    label: "Sky — Female (American, Bright)" },
  { value: "am_adam",   label: "Adam — Male (American)" },
  { value: "am_michael",label: "Michael — Male (American)" },
  { value: "bf_emma",   label: "Emma — Female (British)" },
  { value: "bm_george", label: "George — Male (British)" },
  { value: "bm_lewis",  label: "Lewis — Male (British)" },
];

// AllTalk voices (default voice files — users can add more)
const ALLTALK_VOICES = [
  { value: "female_01.wav", label: "Female 01 (default)" },
  { value: "male_01.wav",   label: "Male 01 (default)" },
  { value: "female_02.wav", label: "Female 02" },
  { value: "male_02.wav",   label: "Male 02" },
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
  const [selectedEngine, setSelectedEngine] = useState("edge");
  const [selectedVoice, setSelectedVoice] = useState("en-US-AriaNeural");
  const [customVoice, setCustomVoice] = useState(""); // for fish speech (reference_id)
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
    const chunkSize = ["openai","kokoro","alltalk","fish"].includes(selectedEngine) ? 4000 : 3500;
    const estChunks = Math.ceil(chars / chunkSize);
    setGenProgress(`Preparing ${estChunks} chunk${estChunks > 1 ? "s" : ""} (~${Math.round(chars / 1000)}k chars) via ${selectedEngine}…`);

    const voiceToSend = selectedEngine === "fish" ? (customVoice || "") : selectedVoice;
    try {
      const r = await fetch("/api/tts/generate-full", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, voice: voiceToSend, engine: selectedEngine }),
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
          <h3 className="font-semibold text-white text-sm">🎙️ Generate Full Audio MP3</h3>
          <p className="text-xs text-gray-500 mt-1">
            Splits long scripts into chunks and merges into one final MP3. Both free options are pre-installed in Docker.
          </p>
        </div>

        {/* Engine picker */}
        <div className="space-y-1">
          <label className="text-xs text-gray-500">Engine:</label>
          <select
            value={selectedEngine}
            onChange={(e) => {
              const eng = e.target.value;
              setSelectedEngine(eng);
              // Reset voice to sensible default per engine
              const defaults: Record<string,string> = { edge: "en-US-AriaNeural", gtts: "en", openai: "nova", kokoro: "af_bella", alltalk: "female_01.wav", fish: "" };
              setSelectedVoice(defaults[eng] ?? "");
              setCustomVoice("");
            }}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-purple-500"
          >
            {["Built-in Free","Local Server","Paid API"].map(group => (
              <optgroup key={group} label={`── ${group} ──`}>
                {ENGINES.filter(e => e.group === group).map((e) => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </optgroup>
            ))}
          </select>
          {/* Local server status hint */}
          {LOCAL_SERVER_PORTS[selectedEngine] && (
            <p className="text-xs text-blue-400">
              🔌 Needs server running on port {LOCAL_SERVER_PORTS[selectedEngine]}.
              {" "}From Docker it connects via <code className="text-green-400">host.docker.internal:{LOCAL_SERVER_PORTS[selectedEngine]}</code>
            </p>
          )}
        </div>

        {/* Voice picker — changes per engine */}
        {selectedEngine !== "fish" && (
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-xs text-gray-500 shrink-0">
              {selectedEngine === "gtts" ? "Language:" : "Voice:"}
            </label>
            <select
              value={selectedVoice}
              onChange={(e) => setSelectedVoice(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none flex-1 min-w-[220px] focus:border-purple-500"
            >
              {selectedEngine === "edge"    && EDGE_VOICES.map((v)    => <option key={v.value} value={v.value}>{v.label}</option>)}
              {selectedEngine === "gtts"    && GTTS_LANGS.map((v)     => <option key={v.value} value={v.value}>{v.label}</option>)}
              {selectedEngine === "openai"  && OPENAI_VOICES.map((v)  => <option key={v.value} value={v.value}>{v.label}</option>)}
              {selectedEngine === "kokoro"  && KOKORO_VOICES.map((v)  => <option key={v.value} value={v.value}>{v.label}</option>)}
              {selectedEngine === "alltalk" && ALLTALK_VOICES.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
            {selectedEngine === "openai" && (
              <span className="text-yellow-500 text-xs">⚠ Requires OPENAI_API_KEY in .env.local</span>
            )}
          </div>
        )}

        {/* Fish Speech: optional reference voice ID */}
        {selectedEngine === "fish" && (
          <div className="space-y-1">
            <label className="text-xs text-gray-500">Reference Voice ID (optional — leave blank for default):</label>
            <input
              type="text"
              value={customVoice}
              onChange={(e) => setCustomVoice(e.target.value)}
              placeholder="e.g. my-voice-id"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-white text-xs outline-none focus:border-purple-500"
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={generateFullAudio}
            disabled={generating || previewGenerating}
            className={`flex items-center gap-2 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
              savedAudioUrl ? "bg-orange-600 hover:bg-orange-500" : "bg-blue-600 hover:bg-blue-500"
            }`}
          >
            {generating ? (
                <><span className="animate-spin inline-block">⟳</span> Generating…</>
              ) : savedAudioUrl ? (
                <>🔄 Regenerate MP3 ({Math.ceil(data.fullText.length / (["openai","kokoro","alltalk","fish"].includes(selectedEngine) ? 4000 : 3500))} chunks)</>
              ) : (
                <>🎙️ Generate Full MP3 ({Math.ceil(data.fullText.length / (["openai","kokoro","alltalk","fish"].includes(selectedEngine) ? 4000 : 3500))} chunks)</>
              )}
          </button>
          <button
            onClick={generatePreview}
            disabled={previewGenerating || generating}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-gray-300 px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            {previewGenerating ? "⟳ Generating…" : "▶ Quick Preview (4k chars)"}
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
            <div className="text-red-300 text-xs whitespace-pre-wrap">{genError}</div>
            {(genError.includes("not installed") || genError.includes("Python")) && (
              <div className="text-yellow-300 text-xs bg-yellow-900/20 rounded p-2 mt-1">
                💡 Install: <code className="text-green-400">pip install edge-tts gtts</code>
                {" "}<button onClick={() => navigator.clipboard.writeText("pip install edge-tts gtts")} className="text-gray-500 hover:text-gray-300 ml-1">📋</button>
              </div>
            )}
            {genError.includes("not running") && (
              <div className="text-yellow-300 text-xs bg-yellow-900/20 rounded p-2 mt-1">
                💡 Start your local TTS server first, then try again.
                {selectedEngine === "kokoro"  && <> Run: <code className="text-green-400">docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2</code></>}
                {selectedEngine === "alltalk" && <> Open AllTalk UI and start the server on port 7851.</>}
                {selectedEngine === "fish"    && <> Run: <code className="text-green-400">python -m tools.api --listen 0.0.0.0:8080</code></>}
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
          {selectedEngine === "edge"    && <>Pre-installed in Docker ✅ — Python + edge-tts</>}
          {selectedEngine === "gtts"    && <>Pre-installed in Docker ✅ — Python + gTTS</>}
          {selectedEngine === "kokoro"  && <>Start Kokoro: <code className="text-green-400">docker run -p 8880:8880 ghcr.io/remsky/kokoro-fastapi-cpu:v0.2.2</code></>}
          {selectedEngine === "alltalk" && <>Start AllTalk from its folder. Accessible at <code className="text-green-400">localhost:7851</code></>}
          {selectedEngine === "fish"    && <>Start Fish Speech: <code className="text-green-400">python -m tools.api --listen 0.0.0.0:8080</code></>}
          {selectedEngine === "openai"  && <>Requires <code className="text-yellow-400">OPENAI_API_KEY</code> — billed at ~$15/1M chars.</>}
          {" · "}Audio saved to project, available in Export tab ZIP.
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
