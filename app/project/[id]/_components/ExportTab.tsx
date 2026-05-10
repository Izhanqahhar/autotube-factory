"use client";
import { useState } from "react";

interface ExportTabProps {
  projectId: string;
  project: Record<string, unknown>;
}

interface YouTubeMeta {
  titles?: string[];
  description?: string;
  tags?: string[];
  pinnedComment?: string;
  hashtags?: string[];
  category?: string;
  chapterMarkers?: string[];
}

interface IntegrationResult {
  ok: boolean;
  error?: string;
  notionUrl?: string;
}

export default function ExportTab({ projectId, project }: ExportTabProps) {
  const [downloading, setDownloading] = useState(false);
  const [zipping, setZipping] = useState(false);
  const [generatingThumb, setGeneratingThumb] = useState(false);
  const [generatingSubs, setGeneratingSubs] = useState(false);
  const [generatingMeta, setGeneratingMeta] = useState(false);
  const [meta, setMeta] = useState<YouTubeMeta | null>(null);
  const [metaError, setMetaError] = useState("");
  const [thumbUrl, setThumbUrl] = useState<string | null>(null);
  const [subsResult, setSubsResult] = useState<{ srtPath?: string; vttPath?: string; method?: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  // Integration state
  const [intgLoading, setIntgLoading] = useState<Record<string, boolean>>({});
  const [intgResult, setIntgResult] = useState<Record<string, IntegrationResult>>({});

  const p = project as {
    title?: string;
    thumbnailUrl?: string;
    subtitleSrtPath?: string;
    subtitleVttPath?: string;
    metadataJson?: string;
    modelProvider?: string;
    modelId?: string;
    research?: unknown;
    script?: { fullScript?: string; title?: string; wordCount?: number } | null;
    scenes?: unknown[];
    imagePrompts?: { generatedImagePath?: string; generatedImageUrl?: string; shortPrompt?: string; altPrompt?: string; promptNumber?: number; imageType?: string; title?: string }[];
    voiceover?: { fullText?: string; segments?: string } | null;
  };

  const hasResearch = !!p.research;
  const hasScript = !!p.script;
  const hasScenes = Array.isArray(p.scenes) && p.scenes.length > 0;
  const hasPrompts = Array.isArray(p.imagePrompts) && p.imagePrompts.length > 0;
  const hasVoiceover = !!p.voiceover;
  const hasThumbnail = !!(thumbUrl ?? p.thumbnailUrl);
  const hasSubtitles = !!(subsResult?.srtPath ?? p.subtitleSrtPath);
  const hasMetadata = !!(meta ?? (p.metadataJson ? JSON.parse(p.metadataJson) : null));

  const savedMeta: YouTubeMeta | null = meta ?? (p.metadataJson ? (() => { try { return JSON.parse(p.metadataJson!); } catch { return null; } })() : null);

  // ── Actions ──────────────────────────────────────────────────────────────

  async function downloadFullJSON() {
    setDownloading(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/export`);
      const blob = await r.blob();
      triggerDownload(blob, `project-export-${projectId}.json`);
    } finally { setDownloading(false); }
  }

  async function downloadZIP() {
    setZipping(true);
    try {
      const r = await fetch(`/api/projects/${projectId}/download`);
      if (!r.ok) { alert("ZIP failed: " + await r.text()); return; }
      const blob = await r.blob();
      triggerDownload(blob, `autotube-project-${projectId.slice(0, 8)}.zip`);
    } finally { setZipping(false); }
  }

  async function generateThumbnail() {
    setGeneratingThumb(true);
    try {
      const r = await fetch("/api/thumbnails/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const d = await r.json();
      if (d.url) setThumbUrl(d.url);
      else alert("Thumbnail failed: " + (d.error ?? "unknown error"));
    } finally { setGeneratingThumb(false); }
  }

  async function generateSubtitles() {
    setGeneratingSubs(true);
    try {
      const r = await fetch("/api/subtitles/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId }),
      });
      const d = await r.json();
      if (d.srtPath) setSubsResult(d);
      else alert("Subtitles failed: " + (d.error ?? "unknown error"));
    } finally { setGeneratingSubs(false); }
  }

  async function generateMetadata() {
    setGeneratingMeta(true);
    setMetaError("");
    try {
      const r = await fetch(`/api/projects/${projectId}/metadata`, {
        method: "POST",
      });
      const d = await r.json();
      if (d.metadata) setMeta(d.metadata);
      else { setMetaError(d.error ?? "Unknown error"); }
    } finally { setGeneratingMeta(false); }
  }

  function downloadText(content: string, filename: string) {
    triggerDownload(new Blob([content], { type: "text/plain" }), filename);
  }

  function triggerDownload(blob: Blob, filename: string) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function copyText(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  // ── Integration exports ─────────────────────────────────────────────────

  async function sendToIntegration(target: "airtable" | "notion" | "slack") {
    setIntgLoading((s) => ({ ...s, [target]: true }));
    setIntgResult((s) => ({ ...s, [target]: { ok: false } }));
    try {
      const r = await fetch(`/api/integrations/export?projectId=${encodeURIComponent(projectId)}&target=${target}`, {
        method: "POST",
      });
      const data = await r.json();
      const res: IntegrationResult = data.results?.[target] ?? { ok: false, error: "No response" };
      setIntgResult((s) => ({ ...s, [target]: res }));
    } catch (e) {
      setIntgResult((s) => ({ ...s, [target]: { ok: false, error: e instanceof Error ? e.message : "Network error" } }));
    }
    setIntgLoading((s) => ({ ...s, [target]: false }));
  }

  function downloadPromptsJSON() {
    if (!hasPrompts) return;
    triggerDownload(new Blob([JSON.stringify(p.imagePrompts, null, 2)], { type: "application/json" }), "image-prompts.json");
  }

  function downloadPromptsTXT() {
    if (!Array.isArray(p.imagePrompts)) return;
    const lines = p.imagePrompts.map((ip) =>
      `#${ip.promptNumber} [${ip.imageType}] ${ip.title}\nPrompt: ${ip.shortPrompt}${ip.altPrompt ? `\nAlt: ${ip.altPrompt}` : ""}`
    ).join("\n\n---\n\n");
    downloadText(lines, "image-prompts.txt");
  }

  // ── Asset status grid ───────────────────────────────────────────────────
  const assets = [
    { label: "Research", available: hasResearch, icon: "🔬" },
    { label: "Script", available: hasScript, icon: "📝" },
    { label: "Scenes", available: hasScenes, icon: "🎬" },
    { label: "Image Prompts", available: hasPrompts, icon: "🖼️" },
    { label: "Voiceover", available: hasVoiceover, icon: "🎙️" },
    { label: "Thumbnail", available: hasThumbnail, icon: "🖼" },
    { label: "Subtitles", available: hasSubtitles, icon: "💬" },
    { label: "YT Metadata", available: hasMetadata, icon: "📺" },
  ];

  const imagesGenerated = Array.isArray(p.imagePrompts)
    ? p.imagePrompts.filter((ip) => ip.generatedImagePath || ip.generatedImageUrl).length
    : 0;

  return (
    <div className="space-y-6">

      {/* ── Asset Status ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white">Asset Status</h3>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {assets.map((a) => (
            <div key={a.label} className={`rounded-xl p-2 text-center border ${a.available ? "border-green-800/50 bg-green-900/10" : "border-gray-800 bg-gray-800/30 opacity-50"}`}>
              <div className="text-xl mb-0.5">{a.icon}</div>
              <div className="text-xs text-gray-400 leading-tight">{a.label}</div>
              <div className={`text-xs mt-0.5 font-medium ${a.available ? "text-green-400" : "text-gray-600"}`}>
                {a.available ? "✓" : "—"}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-gray-500 pt-1">
          {hasPrompts && `${imagesGenerated}/${(p.imagePrompts ?? []).length} images generated`}
          {p.modelId && <span className="ml-3">Model: <span className="text-gray-400">{p.modelId}</span></span>}
        </div>
      </div>

      {/* ── Generate Extra Assets ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white">Generate Extra Assets</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <ActionButton
            icon="🖼"
            label={hasThumbnail ? "Regenerate Thumbnail" : "Generate Thumbnail"}
            description="Sharp + Pollinations AI background"
            loading={generatingThumb}
            onClick={generateThumbnail}
          />
          <ActionButton
            icon="💬"
            label={hasSubtitles ? "Regenerate Subtitles" : "Generate Subtitles"}
            description="Groq Whisper → local Whisper → text fallback"
            loading={generatingSubs}
            onClick={generateSubtitles}
          />
          <ActionButton
            icon="📺"
            label={hasMetadata ? "Regenerate YT Metadata" : "Generate YT Metadata"}
            description="5 titles, description, 30 tags, pinned comment"
            loading={generatingMeta}
            onClick={generateMetadata}
          />
        </div>
        {metaError && <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg p-3">{metaError}</div>}
      </div>

      {/* ── Thumbnail Preview ── */}
      {(thumbUrl ?? p.thumbnailUrl) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-white">Thumbnail Preview</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={thumbUrl ?? p.thumbnailUrl}
            alt="Thumbnail"
            className="rounded-xl w-full max-w-lg border border-gray-700"
          />
          <a
            href={thumbUrl ?? p.thumbnailUrl}
            download="thumbnail.png"
            className="inline-flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            ⬇ Download Thumbnail (PNG)
          </a>
        </div>
      )}

      {/* ── YouTube Metadata ── */}
      {savedMeta && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-white">📺 YouTube Metadata</h3>

          {/* Title options */}
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-400">Title Options (choose one):</div>
            {(savedMeta.titles ?? []).map((t, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-xs text-purple-400 w-4">{i + 1}.</span>
                <div className="flex-1 bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-200">{t}</div>
                <button onClick={() => copyText(t, `title-${i}`)} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded">
                  {copied === `title-${i}` ? "✓" : "Copy"}
                </button>
              </div>
            ))}
          </div>

          {/* Description */}
          {savedMeta.description && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Description:</div>
                <button onClick={() => copyText(savedMeta!.description!, "desc")} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded">
                  {copied === "desc" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <textarea
                readOnly
                value={savedMeta.description}
                rows={6}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-300 resize-none"
              />
            </div>
          )}

          {/* Tags */}
          {savedMeta.tags && savedMeta.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Tags ({savedMeta.tags.length}):</div>
                <button onClick={() => copyText(savedMeta!.tags!.join(", "), "tags")} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded">
                  {copied === "tags" ? "✓ Copied" : "Copy All"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {savedMeta.tags.map((tag, i) => (
                  <span key={i} className="bg-gray-800 text-gray-400 text-xs px-2 py-0.5 rounded-full">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Pinned Comment */}
          {savedMeta.pinnedComment && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Pinned Comment:</div>
                <button onClick={() => copyText(savedMeta!.pinnedComment!, "pin")} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded">
                  {copied === "pin" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-300">{savedMeta.pinnedComment}</div>
            </div>
          )}

          {/* Hashtags */}
          {savedMeta.hashtags && savedMeta.hashtags.length > 0 && (
            <div>
              <div className="text-sm font-medium text-gray-400 mb-1">Hashtags:</div>
              <div className="text-blue-400 text-sm">{savedMeta.hashtags.join(" ")}</div>
            </div>
          )}

          {/* Chapter markers */}
          {savedMeta.chapterMarkers && savedMeta.chapterMarkers.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-medium text-gray-400">Chapter Markers:</div>
                <button onClick={() => copyText(savedMeta!.chapterMarkers!.join("\n"), "chapters")} className="text-xs text-gray-500 hover:text-gray-300 px-2 py-1 bg-gray-800 rounded">
                  {copied === "chapters" ? "✓ Copied" : "Copy"}
                </button>
              </div>
              <div className="bg-gray-800 rounded-lg p-3 text-xs text-gray-300 space-y-0.5 font-mono">
                {savedMeta.chapterMarkers.map((c, i) => <div key={i}>{c}</div>)}
              </div>
            </div>
          )}

          {/* Download metadata as text */}
          <button
            onClick={() => {
              if (!savedMeta) return;
              const txt = [
                "YOUTUBE METADATA",
                "=".repeat(60),
                "\nTITLES:",
                ...(savedMeta.titles ?? []).map((t, i) => `${i + 1}. ${t}`),
                "\nDESCRIPTION:",
                savedMeta.description ?? "",
                "\nTAGS:",
                (savedMeta.tags ?? []).join(", "),
                "\nHASHTAGS:",
                (savedMeta.hashtags ?? []).join(" "),
                "\nPINNED COMMENT:",
                savedMeta.pinnedComment ?? "",
                ...(savedMeta.chapterMarkers?.length ? ["\nCHAPTER MARKERS:", ...(savedMeta.chapterMarkers ?? [])] : []),
              ].join("\n");
              downloadText(txt, "youtube-metadata.txt");
            }}
            className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-2"
          >
            ⬇ Download as .txt
          </button>
        </div>
      )}

      {/* ── Subtitle Files ── */}
      {(subsResult ?? (p.subtitleSrtPath || p.subtitleVttPath)) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
          <h3 className="font-semibold text-white">💬 Subtitle Files</h3>
          {subsResult?.method && <div className="text-xs text-gray-500">Generated via: {subsResult.method}</div>}
          <div className="flex gap-3 flex-wrap">
            {(subsResult?.srtPath ?? p.subtitleSrtPath) && (
              <a href={subsResult?.srtPath ?? p.subtitleSrtPath} download className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                ⬇ Download .SRT
              </a>
            )}
            {(subsResult?.vttPath ?? p.subtitleVttPath) && (
              <a href={subsResult?.vttPath ?? p.subtitleVttPath} download className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm transition-colors flex items-center gap-2">
                ⬇ Download .VTT
              </a>
            )}
          </div>
        </div>
      )}

      {/* ── Integrations ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
        <div>
          <h3 className="font-semibold text-white">📤 Export &amp; Notifications</h3>
          <p className="text-xs text-gray-500 mt-1">Send this project to connected services. Slack notifies automatically on completion — use these buttons to re-send or export to Airtable/Notion anytime.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

          {/* Airtable */}
          <IntegrationSendCard
            icon="📊"
            name="Airtable"
            description="Log run data, YT titles, tags, prompts & thumbnail"
            colorClass="border-green-800/40 bg-green-900/10"
            loading={!!intgLoading.airtable}
            result={intgResult.airtable}
            onSend={() => sendToIntegration("airtable")}
          />

          {/* Notion */}
          <IntegrationSendCard
            icon="📝"
            name="Notion"
            description="Create structured page: script, research, metadata"
            colorClass="border-gray-700/60 bg-gray-800/20"
            loading={!!intgLoading.notion}
            result={intgResult.notion}
            onSend={() => sendToIntegration("notion")}
          />

          {/* Slack */}
          <IntegrationSendCard
            icon="💬"
            name="Slack"
            description="Send Block Kit notification to your channel"
            colorClass="border-purple-800/40 bg-purple-900/10"
            loading={!!intgLoading.slack}
            result={intgResult.slack}
            onSend={() => sendToIntegration("slack")}
          />

        </div>
      </div>

      {/* ── Downloads ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white">Download Options</h3>
        <div className="grid gap-3">
          <ExportButton
            icon="🗜️"
            label="Full Project ZIP Archive"
            description="Everything in one ZIP: scripts, images, voiceover, subtitles, metadata, thumbnail"
            onClick={downloadZIP}
            loading={zipping}
            primary
          />
          <ExportButton
            icon="📦"
            label="Full Project JSON"
            description="Raw data export for developers"
            onClick={downloadFullJSON}
            loading={downloading}
          />
          {hasScript && p.script && (
            <ExportButton
              icon="📝"
              label="Script (.txt)"
              description={`${p.script.wordCount ?? 0} words`}
              onClick={() => downloadText(p.script!.fullScript ?? "", "script.txt")}
            />
          )}
          {hasPrompts && (
            <>
              <ExportButton
                icon="🖼️"
                label="Image Prompts (.txt)"
                description={`${(p.imagePrompts ?? []).length} prompts formatted for AI image tools`}
                onClick={downloadPromptsTXT}
              />
              <ExportButton
                icon="📋"
                label="Image Prompts (.json)"
                description="Full JSON with timing, image paths, and metadata"
                onClick={downloadPromptsJSON}
              />
            </>
          )}
          {hasVoiceover && p.voiceover && (
            <ExportButton
              icon="🎙️"
              label="Voiceover Text (.txt)"
              description="Ready to paste into ElevenLabs or any TTS tool"
              onClick={() => downloadText(p.voiceover!.fullText ?? "", "voiceover.txt")}
            />
          )}
        </div>
      </div>

      {/* ── Usage Guide ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
        <h3 className="font-semibold text-white">🎬 Video Production Workflow</h3>
        <div className="space-y-2 text-sm text-gray-400">
          {[
            ["1.", "Use the Voiceover tab to generate MP3 audio with Edge TTS or gTTS (free)"],
            ["2.", "Generate Subtitles above — Groq Whisper processes the audio file automatically"],
            ["3.", "Generate Thumbnail — Pollinations AI creates a cinematic 1280×720 PNG"],
            ["4.", "Generate YouTube Metadata — get 5 titles, description, 30 tags, pinned comment"],
            ["5.", "Go to Image Prompts tab → bulk generate all images (Pollinations, $0 cost)"],
            ["6.", "Download ZIP — everything packed and ready to import into your video editor"],
            ["7.", "Import audio + images into CapCut, DaVinci Resolve, or Premiere Pro"],
            ["8.", "Add the .SRT subtitle file to your video editor for automatic captions"],
            ["9.", "Upload to YouTube using the generated title, description, and tags"],
          ].map(([num, text]) => (
            <div key={num as string} className="flex gap-3">
              <span className="text-purple-400 shrink-0">{num}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ExportButton({
  icon, label, description, onClick, loading = false, primary = false,
}: {
  icon: string; label: string; description: string;
  onClick: () => void; loading?: boolean; primary?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`w-full flex items-center gap-4 p-4 rounded-xl text-left transition-colors ${
        primary
          ? "bg-purple-600/20 border border-purple-700/50 hover:bg-purple-600/30 text-white"
          : "bg-gray-800/50 border border-gray-700/50 hover:bg-gray-800 text-gray-300"
      } disabled:opacity-50`}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1">
        <div className="font-medium">{label}</div>
        <div className="text-xs opacity-60 mt-0.5">{description}</div>
      </div>
      <span className="text-xs opacity-50">{loading ? "⟳ Working..." : "⬇"}</span>
    </button>
  );
}

// ── Integration Send Card ─────────────────────────────────────────────────────

function getErrorHint(name: string, error?: string): string | null {
  if (!error) return null;
  const e = error.toLowerCase();
  if (name === "Airtable") {
    if (e.includes("403"))
      return "Fix: Go to airtable.com/create/tokens → edit your PAT → enable scope data.records:write and grant access to this base.";
    if (e.includes("401") || e.includes("unauthorized"))
      return "Fix: AIRTABLE_API_KEY is invalid. Create a new PAT at airtable.com/create/tokens.";
    if (e.includes("404") || e.includes("not found"))
      return "Fix: Check AIRTABLE_BASE_ID and AIRTABLE_RUNS_TABLE_ID in .env.local match your base.";
  }
  if (name === "Notion") {
    if (e.includes("404") || e.includes("object_not_found"))
      return "Fix: In Notion, open the parent page → ⋯ menu → Add connections → select your integration. Or clear NOTION_PARENT_PAGE_ID to create at workspace root.";
    if (e.includes("401") || e.includes("unauthorized"))
      return "Fix: NOTION_API_KEY is invalid. Check your integration token at notion.so/my-integrations.";
  }
  if (name === "Slack") {
    if (e.includes("not_in_channel"))
      return "Fix: Invite the bot: in Slack, open the channel → /invite @YourBotName";
    if (e.includes("invalid_auth") || e.includes("401"))
      return "Fix: SLACK_BOT_TOKEN is invalid. Go to api.slack.com/apps → OAuth & Permissions → copy Bot User OAuth Token (xoxb-...).";
    if (e.includes("channel_not_found"))
      return "Fix: Check SLACK_CHANNEL_ID. Right-click the channel in Slack → Copy link — the ID is the last part (C0B3MDH3KNC).";
  }
  return null;
}

function IntegrationSendCard({
  icon, name, description, colorClass, loading, result, onSend,
}: {
  icon: string;
  name: string;
  description: string;
  colorClass: string;
  loading: boolean;
  result?: IntegrationResult;
  onSend: () => void;
}) {
  const hint = result && !result.ok ? getErrorHint(name, result.error) : null;

  return (
    <div className={`border rounded-xl p-4 space-y-3 flex flex-col ${colorClass}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl">{icon}</span>
        <span className="font-medium text-white text-sm">{name}</span>
      </div>
      <p className="text-xs text-gray-500 flex-1">{description}</p>

      {result && (
        <div className={`text-xs rounded-lg px-2 py-2 space-y-1.5 ${result.ok ? "bg-green-900/20 border border-green-800/30" : "bg-red-900/20 border border-red-800/30"}`}>
          {result.ok ? (
            <div className="text-green-400">
              ✅ Sent successfully
              {result.notionUrl && (
                <a href={result.notionUrl} target="_blank" rel="noopener noreferrer" className="ml-2 underline text-blue-400">Open page →</a>
              )}
            </div>
          ) : (
            <>
              <div className="text-red-400" title={result.error}>
                ❌ {result.error?.slice(0, 100)}{(result.error?.length ?? 0) > 100 ? "…" : ""}
              </div>
              {hint && (
                <div className="text-yellow-300 bg-yellow-900/20 border border-yellow-800/30 rounded p-1.5 text-xs leading-snug">
                  💡 {hint}
                </div>
              )}
            </>
          )}
        </div>
      )}

      <button
        onClick={onSend}
        disabled={loading}
        className="w-full py-2 rounded-lg text-xs font-medium transition-colors bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50"
      >
        {loading ? "⟳ Sending…" : `▶ Send to ${name}`}
      </button>
    </div>
  );
}

function ActionButton({
  icon, label, description, onClick, loading,
}: {
  icon: string; label: string; description: string;
  onClick: () => void; loading: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-start gap-1 p-4 bg-gray-800/60 border border-gray-700/50 hover:bg-gray-800 rounded-xl text-left transition-colors disabled:opacity-50 w-full"
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{icon}</span>
        <span className="text-sm font-medium text-white">{loading ? "Working..." : label}</span>
      </div>
      <div className="text-xs text-gray-500">{description}</div>
    </button>
  );
}
