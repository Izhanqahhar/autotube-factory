"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDate, STATUS_CONFIG } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  niche: string;
  duration: number;
  style: string;
  tone: string;
  status: string;
  createdAt: string;
  thumbnailUrl?: string | null;
  _count?: { scenes: number; imagePrompts: number };
  script?: { wordCount: number; qualityScore: number } | null;
}

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "completed", label: "✅ Completed" },
  { value: "generating", label: "⏳ Generating" },
  { value: "failed", label: "❌ Failed" },
  { value: "pending", label: "🕐 Pending" },
];

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function load() {
    const r = await fetch("/api/projects");
    const d = await r.json();
    setProjects(Array.isArray(d) ? d : []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function deleteProject(id: string, title: string) {
    if (!confirm(`Delete "${title}"?\n\nThis will permanently remove the project and all its data.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setProjects((p) => p.filter((x) => x.id !== id));
    setDeleting(null);
  }

  const filtered = projects.filter((p) => {
    if (filter !== "all" && p.status !== filter) return false;
    if (search.trim() && !p.title.toLowerCase().includes(search.toLowerCase()) && !p.niche.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = {
    all: projects.length,
    completed: projects.filter((p) => p.status === "completed").length,
    generating: projects.filter((p) => p.status === "generating").length,
    failed: projects.filter((p) => p.status === "failed").length,
    pending: projects.filter((p) => p.status === "pending").length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 animate-pulse">Loading projects…</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Projects</h1>
          <p className="text-gray-400 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {counts.completed} completed
          </p>
        </div>
        <Link
          href="/new"
          className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-colors flex items-center gap-2"
        >
          🎬 New Video
        </Link>
      </div>

      {projects.length === 0 ? (
        /* Empty state */
        <div className="text-center py-24 bg-gray-900/50 rounded-2xl border border-gray-800 space-y-4">
          <div className="text-5xl">🎬</div>
          <h2 className="text-xl font-semibold text-white">No projects yet</h2>
          <p className="text-gray-500 max-w-sm mx-auto">Create your first video asset pack — just enter a topic title and we'll generate everything.</p>
          <Link href="/new" className="inline-block bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-xl font-medium transition-colors mt-2">
            🚀 Create First Project
          </Link>
        </div>
      ) : (
        <>
          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <input
              type="text"
              placeholder="🔍 Search by title or niche…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 bg-gray-900 border border-gray-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 outline-none transition-colors"
            />
            {/* Status filter chips */}
            <div className="flex gap-1.5 flex-wrap">
              {STATUS_FILTERS.map((f) => {
                const count = counts[f.value as keyof typeof counts] ?? 0;
                return (
                  <button
                    key={f.value}
                    onClick={() => setFilter(f.value)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      filter === f.value
                        ? "bg-purple-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700"
                    }`}
                  >
                    {f.label}
                    {f.value !== "all" && count > 0 && (
                      <span className={`ml-1.5 ${filter === f.value ? "text-purple-200" : "text-gray-600"}`}>{count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* No results */}
          {filtered.length === 0 && (
            <div className="text-center py-16 text-gray-500">
              No projects match your filters.
              <button onClick={() => { setFilter("all"); setSearch(""); }} className="block mx-auto mt-2 text-purple-400 hover:text-purple-300 text-sm">
                Clear filters
              </button>
            </div>
          )}

          {/* Project grid */}
          <div className="grid gap-4">
            {filtered.map((p) => {
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
              const isGenerating = p.status === "generating";
              return (
                <div key={p.id}
                  className={`bg-gray-900 border rounded-xl p-5 transition-colors ${
                    isGenerating ? "border-yellow-800/50 bg-yellow-900/5" : "border-gray-800 hover:border-gray-700"
                  }`}>
                  <div className="flex items-start gap-4">
                    {/* Thumbnail or placeholder */}
                    <div className="shrink-0 hidden sm:block">
                      {p.thumbnailUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.thumbnailUrl} alt="" className="w-20 h-12 rounded-lg object-cover border border-gray-700" />
                      ) : (
                        <div className={`w-20 h-12 rounded-lg border flex items-center justify-center text-2xl ${
                          isGenerating ? "border-yellow-800/40 bg-yellow-900/10" : "border-gray-800 bg-gray-800/50"
                        }`}>
                          {isGenerating ? "⏳" : p.status === "completed" ? "🎥" : "📋"}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-white text-base truncate">{p.title}</h3>
                          <div className="flex items-center gap-2 mt-1 flex-wrap text-xs text-gray-500">
                            <span className="bg-gray-800 px-2 py-0.5 rounded">{p.niche}</span>
                            <span>{p.duration} min</span>
                            <span>{p.style}</span>
                            {p._count?.imagePrompts ? <span>🖼️ {p._count.imagePrompts}</span> : null}
                            {p._count?.scenes ? <span>🎬 {p._count.scenes}</span> : null}
                            {p.script?.wordCount ? <span>📝 {p.script.wordCount}w</span> : null}
                            {p.script?.qualityScore ? (
                              <span className={p.script.qualityScore >= 80 ? "text-green-400" : p.script.qualityScore >= 60 ? "text-yellow-400" : "text-gray-500"}>
                                ⭐ {p.script.qualityScore}/100
                              </span>
                            ) : null}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{formatDate(p.createdAt)}</div>
                        </div>
                        <span className={`text-xs px-2.5 py-1 rounded-full border shrink-0 ${sc.color}`}>{sc.label}</span>
                      </div>

                      {isGenerating && (
                        <div className="mt-2 text-xs text-yellow-400 flex items-center gap-1.5">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
                          Generation in progress…
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-800">
                    <Link
                      href={`/project/${p.id}`}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm transition-colors font-medium flex items-center gap-1.5"
                    >
                      {isGenerating ? "⏳ View Progress" : "📂 Open Project"}
                    </Link>
                    {p.status === "completed" && (
                      <Link
                        href={`/project/${p.id}#export`}
                        className="bg-purple-600/20 hover:bg-purple-600/30 border border-purple-700/40 text-purple-300 px-4 py-2 rounded-lg text-sm transition-colors"
                      >
                        📦 Export
                      </Link>
                    )}
                    <div className="flex-1" />
                    <button
                      onClick={() => deleteProject(p.id, p.title)}
                      disabled={deleting === p.id}
                      className="text-gray-600 hover:text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {deleting === p.id ? "Deleting…" : "🗑️ Delete"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
