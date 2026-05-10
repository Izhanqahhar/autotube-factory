"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import GenerationProgress from "./_components/GenerationProgress";
import OverviewTab from "./_components/OverviewTab";
import ResearchTab from "./_components/ResearchTab";
import ScriptTab from "./_components/ScriptTab";
import ScenesTab from "./_components/ScenesTab";
import ImagePromptsTab from "./_components/ImagePromptsTab";
import VoiceoverTab from "./_components/VoiceoverTab";
import ExportTab from "./_components/ExportTab";

const TABS = [
  { id: "overview",       label: "📊 Overview",       short: "Overview" },
  { id: "research",       label: "🔬 Research",        short: "Research" },
  { id: "script",         label: "📝 Script",          short: "Script" },
  { id: "scenes",         label: "🎬 Scenes",          short: "Scenes" },
  { id: "image-prompts",  label: "🖼️ Images",          short: "Images" },
  { id: "voiceover",      label: "🎙️ Voiceover",       short: "Voice" },
  { id: "export",         label: "📦 Export",          short: "Export" },
];

const STATUS_STYLES: Record<string, string> = {
  completed:  "bg-green-500/15 text-green-300 border-green-700/40",
  generating: "bg-yellow-500/15 text-yellow-300 border-yellow-700/40 animate-pulse",
  failed:     "bg-red-500/15   text-red-300   border-red-700/40",
  pending:    "bg-gray-500/15  text-gray-400  border-gray-700/40",
};

const STATUS_LABELS: Record<string, string> = {
  completed:  "✅ Completed",
  generating: "⏳ Generating…",
  failed:     "❌ Failed",
  pending:    "🕐 Pending",
};

export default function ProjectPage() {
  const params = useParams();
  const id = params.id as string;
  const [project, setProject] = useState<Record<string, unknown> | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const loadProject = useCallback(async () => {
    try {
      const r = await fetch(`/api/projects/${id}`);
      const d = await r.json();
      setProject(d);
      setIsGenerating(d.status === "generating");
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadProject(); }, [loadProject]);

  function handleGenerationComplete() {
    setIsGenerating(false);
    loadProject();
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="text-4xl animate-spin">⚙️</div>
          <div className="text-gray-500">Loading project…</div>
        </div>
      </div>
    );
  }

  if (!project || (project as { error?: string }).error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-5xl">❌</div>
        <h2 className="text-xl font-semibold text-white">Project not found</h2>
        <Link href="/projects" className="text-purple-400 hover:text-purple-300 text-sm underline">
          ← Back to Projects
        </Link>
      </div>
    );
  }

  const p = project as {
    id: string;
    title: string;
    niche: string;
    audience: string;
    duration: number;
    style: string;
    tone: string;
    status: string;
    currentStep: string;
    createdAt: string;
    modelId?: string;
    thumbnailUrl?: string;
    script?: { wordCount: number; qualityScore: number } | null;
    _count?: { imagePrompts: number; scenes: number };
    imagePrompts?: unknown[];
    research?: unknown;
    voiceover?: unknown;
  };

  const imagePromptCount = Array.isArray(p.imagePrompts) ? p.imagePrompts.length : (p._count?.imagePrompts ?? 0);
  const sceneCount = Array.isArray(p._count) ? 0 : (p._count?.scenes ?? 0);
  const statusStyle = STATUS_STYLES[p.status] ?? STATUS_STYLES.pending;
  const statusLabel = STATUS_LABELS[p.status] ?? p.status;

  // Breadcrumb metadata pills
  const pills = [
    p.niche,
    `${p.duration} min`,
    p.script?.wordCount ? `${p.script.wordCount.toLocaleString()} words` : null,
    imagePromptCount > 0 ? `${imagePromptCount} prompts` : null,
    sceneCount > 0 ? `${sceneCount} scenes` : null,
  ].filter(Boolean);

  return (
    <div className="space-y-0">

      {/* ── Hero Header ── */}
      <div className="bg-gray-900/50 border-b border-gray-800 px-0 pt-2 pb-0 mb-6">

        {/* Back nav */}
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 group"
        >
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
          All Projects
        </Link>

        {/* Title row */}
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-white leading-tight truncate">
              {p.title}
            </h1>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {pills.map((pill) => (
                <span key={pill as string} className="bg-gray-800 text-gray-400 text-xs px-2.5 py-0.5 rounded-full border border-gray-700/50">
                  {pill}
                </span>
              ))}
            </div>
          </div>

          {/* Status + CTA */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${statusStyle}`}>
              {statusLabel}
            </span>
            {p.status === "completed" && (
              <button
                onClick={() => setActiveTab("export")}
                className="bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-purple-900/30"
              >
                📦 Export
              </button>
            )}
          </div>
        </div>

        {/* Quick stats bar (only when completed) */}
        {p.status === "completed" && (
          <div className="flex items-center gap-4 text-xs text-gray-500 pb-3 flex-wrap">
            {p.script?.qualityScore && (
              <span className="flex items-center gap-1">
                <span className="text-purple-400 font-semibold">{p.script.qualityScore}/100</span> quality
              </span>
            )}
            {!!p.research && <span className="text-green-500">✓ Research</span>}
            {!!p.script && <span className="text-green-500">✓ Script</span>}
            {imagePromptCount > 0 && <span className="text-green-500">✓ {imagePromptCount} Image Prompts</span>}
            {!!p.voiceover && <span className="text-green-500">✓ Voiceover</span>}
            {!!p.thumbnailUrl && <span className="text-green-500">✓ Thumbnail</span>}
          </div>
        )}

        {/* Generation Progress inline */}
        {isGenerating && (
          <div className="pb-4">
            <GenerationProgress projectId={id} onComplete={handleGenerationComplete} />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 overflow-x-auto -mx-0 mt-2">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-all border-b-2 -mb-px ${
                activeTab === tab.id
                  ? "border-purple-500 text-purple-300 bg-purple-500/5"
                  : "border-transparent text-gray-500 hover:text-gray-300 hover:bg-gray-800/30"
              }`}
            >
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="pt-0">
        {activeTab === "overview"      && <OverviewTab project={project} onRefresh={loadProject} />}
        {activeTab === "research"      && <ResearchTab projectId={id} />}
        {activeTab === "script"        && <ScriptTab projectId={id} />}
        {activeTab === "scenes"        && <ScenesTab projectId={id} />}
        {activeTab === "image-prompts" && <ImagePromptsTab projectId={id} duration={p.duration} />}
        {activeTab === "voiceover"     && <VoiceoverTab projectId={id} />}
        {activeTab === "export"        && <ExportTab projectId={id} project={project} />}
      </div>

    </div>
  );
}
