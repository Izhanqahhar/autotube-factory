"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";

interface OverviewTabProps {
  project: Record<string, unknown>;
  onRefresh: () => void;
}

export default function OverviewTab({ project, onRefresh }: OverviewTabProps) {
  const router = useRouter();
  const [runningStep, setRunningStep] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const p = project as {
    id: string;
    title: string;
    niche: string;
    audience: string;
    duration: number;
    style: string;
    tone: string;
    notes?: string;
    status: string;
    currentStep: string;
    errorMessage?: string;
    modelId?: string;
    modelProvider?: string;
    modelUsed?: string;
    researchModelId?: string;
    scriptModelId?: string;
    imagePromptModelId?: string;
    thumbnailUrl?: string;
    subtitleSrtPath?: string;
    metadataJson?: string;
    totalCostUsd?: number;
    generationTimeMs?: number;
    createdAt: string;
    exportToAirtable?: boolean;
    exportToNotion?: boolean;
    script?: { wordCount: number; qualityScore: number; title?: string; hook?: string } | null;
    scenes?: unknown[];
    imagePrompts?: { generatedImagePath?: string; generatedImageUrl?: string }[];
    voiceover?: { wordCount?: number; estimatedDuration?: number } | null;
    research?: { summary?: string } | null;
  };

  const imagesGenerated = Array.isArray(p.imagePrompts)
    ? p.imagePrompts.filter((ip) => ip.generatedImagePath || ip.generatedImageUrl).length
    : 0;
  const imagesTotal = Array.isArray(p.imagePrompts) ? p.imagePrompts.length : 0;

  async function deleteProject() {
    await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
    router.push("/projects");
  }

  async function handleReRun(step: string) {
    setRunningStep(step);
    try {
      await fetch(`/api/projects/${p.id}/${step}`, { method: "POST" });
      onRefresh();
    } finally {
      setRunningStep(null);
    }
  }

  // ── Asset pipeline status ──────────────────────────────────────────────────
  const assetStatuses = [
    { label: "Research",     ready: !!p.research,                                           icon: "🔬" },
    { label: "Script",       ready: !!p.script,                                              icon: "📝" },
    { label: "Scenes",       ready: Array.isArray(p.scenes) && p.scenes.length > 0,         icon: "🎬" },
    { label: "Img Prompts",  ready: imagesTotal > 0,                                         icon: "🖼️" },
    { label: "Voiceover",    ready: !!p.voiceover,                                           icon: "🎙️" },
    { label: "Thumbnail",    ready: !!p.thumbnailUrl,                                        icon: "🖼" },
    { label: "Subtitles",    ready: !!p.subtitleSrtPath,                                     icon: "💬" },
    { label: "YT Metadata",  ready: !!p.metadataJson,                                        icon: "📺" },
  ];
  const readyCount = assetStatuses.filter((a) => a.ready).length;

  return (
    <div className="space-y-5">

      {/* ── Thumbnail banner (if generated) ── */}
      {p.thumbnailUrl && (
        <div className="relative rounded-xl overflow-hidden border border-gray-800 max-h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.thumbnailUrl} alt="Thumbnail" className="w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 via-transparent to-transparent" />
          <div className="absolute bottom-3 left-4 text-white font-semibold text-lg drop-shadow">
            {p.title}
          </div>
        </div>
      )}

      {/* ── Key Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Quality",      value: p.script?.qualityScore ? `${p.script.qualityScore}/100` : "—",  color: "text-purple-300", bg: "bg-purple-500/10 border-purple-800/30" },
          { label: "Word Count",   value: p.script?.wordCount ? p.script.wordCount.toLocaleString() : "—", color: "text-blue-300",   bg: "bg-blue-500/10 border-blue-800/30" },
          { label: "Images",       value: imagesTotal > 0 ? `${imagesGenerated}/${imagesTotal}` : "—",      color: "text-green-300",  bg: "bg-green-500/10 border-green-800/30" },
          { label: "Duration",     value: `${p.duration} min`,                                              color: "text-orange-300", bg: "bg-orange-500/10 border-orange-800/30" },
        ].map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 text-center ${s.bg}`}>
            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
            <div className="text-gray-500 text-xs mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Asset Pipeline ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-white text-sm">Pipeline Status</h3>
          <span className="text-xs text-gray-500">{readyCount}/{assetStatuses.length} ready</span>
        </div>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {assetStatuses.map((a) => (
            <div key={a.label} className={`rounded-lg p-2 text-center border transition-colors ${
              a.ready
                ? "border-green-800/50 bg-green-900/10"
                : "border-gray-800/60 bg-gray-800/20 opacity-50"
            }`}>
              <div className="text-base mb-0.5">{a.icon}</div>
              <div className="text-xs text-gray-400 leading-tight">{a.label}</div>
              <div className={`text-xs mt-0.5 font-bold ${a.ready ? "text-green-400" : "text-gray-700"}`}>
                {a.ready ? "✓" : "○"}
              </div>
            </div>
          ))}
        </div>
        {readyCount < assetStatuses.length && (
          <p className="text-xs text-gray-600">
            Head to the <strong className="text-gray-500">Export tab</strong> to generate thumbnail, subtitles &amp; YouTube metadata.
          </p>
        )}
      </div>

      {/* ── Hook / Research Preview ── */}
      {(p.script?.hook || p.research?.summary) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {p.script?.hook && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-purple-400 uppercase tracking-wider">🎣 Hook</h3>
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{p.script.hook}</p>
            </div>
          )}
          {p.research?.summary && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">🔬 Research</h3>
              <p className="text-sm text-gray-400 leading-relaxed line-clamp-4">{p.research.summary}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Project Details ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-white text-sm mb-3">Project Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 text-sm">
          {[
            { label: "Niche",    value: p.niche },
            { label: "Audience", value: p.audience },
            { label: "Style",    value: p.style },
            { label: "Tone",     value: p.tone },
            { label: "Created",  value: formatDate(p.createdAt) },
            { label: "Step",     value: p.currentStep },
          ].map((d) => (
            <div key={d.label} className="flex gap-2 items-start">
              <span className="text-gray-600 w-16 shrink-0 text-xs pt-0.5">{d.label}</span>
              <span className="text-gray-300 text-xs">{d.value}</span>
            </div>
          ))}
        </div>
        {(p.exportToAirtable || p.exportToNotion) && (
          <div className="mt-3 pt-3 border-t border-gray-800 flex gap-2 text-xs text-gray-500">
            <span>Auto-export:</span>
            {p.exportToAirtable && <span className="text-green-400">📊 Airtable</span>}
            {p.exportToNotion && <span className="text-gray-300">📝 Notion</span>}
            <span className="text-purple-400">💬 Slack (always)</span>
          </div>
        )}
        {p.notes && (
          <div className="mt-3 pt-3 border-t border-gray-800 text-xs text-gray-400">
            <span className="text-gray-600">Notes:</span> {p.notes}
          </div>
        )}
      </div>

      {/* ── Model Info ── */}
      {(p.researchModelId || p.scriptModelId || p.modelId) && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <h3 className="font-semibold text-white text-sm mb-3">🤖 Models Used</h3>
          <div className="space-y-1.5 text-xs">
            {[
              { label: "Research",      value: p.researchModelId ?? p.modelId },
              { label: "Script",        value: p.scriptModelId ?? p.modelId },
              { label: "Image Prompts", value: p.imagePromptModelId ?? p.modelId },
            ].map((m) => m.value ? (
              <div key={m.label} className="flex gap-3">
                <span className="text-gray-500 w-28 shrink-0">{m.label}</span>
                <code className="text-gray-300 bg-gray-800 px-1.5 py-0.5 rounded text-xs">{m.value}</code>
              </div>
            ) : null)}
            {p.generationTimeMs && (
              <div className="flex gap-3 pt-1">
                <span className="text-gray-500 w-28 shrink-0">Gen Time</span>
                <span className="text-gray-300">{(p.generationTimeMs / 1000).toFixed(1)}s</span>
              </div>
            )}
            {typeof p.totalCostUsd === "number" && (
              <div className="flex gap-3">
                <span className="text-gray-500 w-28 shrink-0">Cost</span>
                <span className={p.totalCostUsd === 0 ? "text-green-400 font-semibold" : "text-gray-300"}>
                  {p.totalCostUsd === 0 ? "$0.00 (free)" : `$${p.totalCostUsd.toFixed(4)}`}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {p.errorMessage && (
        <div className="bg-red-900/20 border border-red-700/50 rounded-xl p-4 text-red-300 text-sm space-y-1">
          <div className="font-semibold text-red-400">❌ Generation Error</div>
          <div>{p.errorMessage}</div>
        </div>
      )}

      {/* ── Re-run Steps ── */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <h3 className="font-semibold text-white text-sm mb-3">🔁 Re-run Individual Steps</h3>
        <div className="flex flex-wrap gap-2">
          {[
            { key: "research",      label: "🔬 Research" },
            { key: "script",        label: "📝 Script" },
            { key: "scenes",        label: "🎬 Scenes" },
            { key: "image-prompts", label: "🖼️ Images" },
            { key: "voiceover",     label: "🎙️ Voiceover" },
          ].map((step) => (
            <button
              key={step.key}
              disabled={!!runningStep}
              onClick={() => handleReRun(step.key)}
              className="bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-gray-300 hover:text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border border-gray-700/50"
            >
              {runningStep === step.key ? "⟳ Running…" : step.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-gray-600 mt-2">Re-runs will overwrite existing data for that step only.</p>
      </div>

      {/* ── Danger Zone ── */}
      <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4">
        <h3 className="font-semibold text-red-500 text-sm mb-2">Danger Zone</h3>
        {deleteConfirm ? (
          <div className="flex items-center gap-3">
            <span className="text-red-300 text-xs">Delete permanently?</span>
            <button
              onClick={deleteProject}
              className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            >
              Yes, delete
            </button>
            <button
              onClick={() => setDeleteConfirm(false)}
              className="text-gray-500 hover:text-gray-300 text-xs px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeleteConfirm(true)}
            className="bg-gray-800 hover:bg-red-900/30 border border-gray-700/50 hover:border-red-700/50 text-red-400 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
          >
            🗑️ Delete Project
          </button>
        )}
      </div>

    </div>
  );
}
