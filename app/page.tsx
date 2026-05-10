"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { formatDate, STATUS_CONFIG } from "@/lib/utils";

interface Project {
  id: string;
  title: string;
  niche: string;
  duration: number;
  status: string;
  createdAt: string;
  modelId?: string | null;
  _count?: { scenes: number; imagePrompts: number };
  script?: { wordCount: number } | null;
}

const PIPELINE_STEPS = [
  { icon: "🔬", label: "Research", desc: "Facts, hooks & claims" },
  { icon: "📝", label: "Script", desc: "Full video script" },
  { icon: "🎬", label: "Scenes", desc: "Timed breakdown" },
  { icon: "🖼️", label: "Image Prompts", desc: "12 per minute" },
  { icon: "🎙️", label: "Voiceover", desc: "TTS-ready text" },
];

const QUICK_START = [
  {
    step: "1",
    icon: "🚀",
    title: "Create a Video",
    desc: "Click \"New Video\", enter a topic title and target audience — that's all the required fields.",
    color: "from-purple-900/30 to-gray-900 border-purple-800/40",
    href: "/new",
    cta: "Create Now →",
  },
  {
    step: "2",
    icon: "⏳",
    title: "Wait ~60–90 sec",
    desc: "The pipeline runs automatically: Research → Script → Scenes → Image Prompts → Voiceover.",
    color: "from-blue-900/20 to-gray-900 border-blue-800/30",
    href: null,
    cta: null,
  },
  {
    step: "3",
    icon: "📦",
    title: "Export Your Assets",
    desc: "Download ZIP with script, image prompts, voiceover text, thumbnail, subtitles and YT metadata.",
    color: "from-green-900/20 to-gray-900 border-green-800/30",
    href: "/projects",
    cta: "View Projects →",
  },
];

export default function HomePage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [memoryStats, setMemoryStats] = useState({ feeds: 0, items: 0, topics: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/projects").then((r) => r.json()).catch(() => []),
      fetch("/api/rss/feeds").then((r) => r.json()).catch(() => []),
      fetch("/api/rss/topics?status=pending").then((r) => r.json()).catch(() => []),
    ]).then(([proj, feeds, topics]) => {
      setProjects(Array.isArray(proj) ? proj : []);
      setMemoryStats({
        feeds: Array.isArray(feeds) ? feeds.filter((f: any) => f.isActive).length : 0,
        items: 0,
        topics: Array.isArray(topics) ? topics.length : 0,
      });
      fetch("/api/rss/items?hours=720&limit=200").then((r) => r.json()).then((d) => {
        setMemoryStats((prev) => ({ ...prev, items: Array.isArray(d) ? d.length : 0 }));
      }).catch(() => {});
      setLoading(false);
    });
  }, []);

  const recent = projects.slice(0, 5);
  const stats = {
    total: projects.length,
    completed: projects.filter((p) => p.status === "completed").length,
    totalPrompts: projects.reduce((a, p) => a + (p._count?.imagePrompts ?? 0), 0),
  };
  const isNewUser = !loading && projects.length === 0;

  return (
    <div className="space-y-12">

      {/* ── Hero ── */}
      <div className="text-center pt-6 pb-4 space-y-5">
        <div className="text-6xl">🎬</div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white">AutoTube Factory</h1>
        <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
          AI-powered YouTube automation. Enter a topic — get research, script, scenes,
          image prompts &amp; voiceover in minutes. <span className="text-green-400 font-medium">Free to start.</span>
        </p>
        <div className="flex items-center justify-center gap-3 pt-2 flex-wrap">
          <Link href="/new"
            className="bg-purple-600 hover:bg-purple-500 text-white px-8 py-4 rounded-xl text-lg font-semibold transition-colors shadow-lg shadow-purple-900/30 flex items-center gap-2">
            🚀 Create New Video
          </Link>
          <Link href="/memory"
            className="bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 hover:text-white px-6 py-4 rounded-xl text-base transition-colors flex items-center gap-2">
            🧠 Discover Topics
          </Link>
        </div>
        <div className="flex items-center justify-center gap-4 text-xs text-gray-600 flex-wrap pt-1">
          <span>✅ No billing required</span>
          <span>·</span>
          <span>⚡ Groq &amp; Google AI free tiers</span>
          <span>·</span>
          <span>🌸 Pollinations images free</span>
          <span>·</span>
          <span>🎙️ Edge TTS free</span>
        </div>
      </div>

      {/* ── Quick Start — only shown to new users ── */}
      {isNewUser && (
        <div className="space-y-4">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-white">👋 Welcome! Here&apos;s how to get started</h2>
            <p className="text-gray-500 text-sm mt-1">Works right away with free APIs — no credit card, no complex setup.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {QUICK_START.map((s) => (
              <div key={s.step}
                className={`bg-gradient-to-br ${s.color} border rounded-2xl p-5 space-y-3 flex flex-col`}>
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-400 shrink-0">{s.step}</span>
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <div>
                  <div className="font-semibold text-white">{s.title}</div>
                  <div className="text-gray-400 text-sm mt-1 leading-relaxed">{s.desc}</div>
                </div>
                {s.href && s.cta && (
                  <Link href={s.href} className="mt-auto text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium">
                    {s.cta}
                  </Link>
                )}
              </div>
            ))}
          </div>
          <div className="bg-blue-900/10 border border-blue-800/30 rounded-xl px-5 py-4 text-sm text-blue-300 space-y-1">
            <div className="font-medium">💡 Want even better results?</div>
            <div className="text-blue-400/80">
              Add a free <a href="https://console.groq.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Groq API key</a> for
              faster generation, or a <a href="https://aistudio.google.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300">Google AI key</a> for
              Gemini models. Both have generous free tiers.{" "}
              <Link href="/settings" className="underline hover:text-blue-300">Configure in Settings →</Link>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      {!isNewUser && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[
            { label: "Projects", value: stats.total, icon: "📁", href: "/projects" },
            { label: "Completed", value: stats.completed, icon: "✅", href: "/projects" },
            { label: "Image Prompts", value: stats.totalPrompts, icon: "🖼️", href: "/projects" },
            { label: "Active Feeds", value: memoryStats.feeds, icon: "📡", href: "/memory" },
            { label: "Stored Items", value: memoryStats.items, icon: "📰", href: "/memory" },
            { label: "Topic Ideas", value: memoryStats.topics, icon: "💡", href: "/memory" },
          ].map((s) => (
            <Link key={s.label} href={s.href}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl p-3 text-center transition-colors group">
              <div className="text-xl mb-0.5">{s.icon}</div>
              <div className="text-xl font-bold text-white">{loading ? "—" : s.value}</div>
              <div className="text-gray-500 text-xs mt-0.5 group-hover:text-gray-400 transition-colors leading-tight">{s.label}</div>
            </Link>
          ))}
        </div>
      )}

      {/* ── Recent Projects ── */}
      {!loading && recent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
            <Link href="/projects" className="text-purple-400 hover:text-purple-300 text-sm transition-colors">View all {projects.length} →</Link>
          </div>
          <div className="grid gap-3">
            {recent.map((p) => {
              const sc = STATUS_CONFIG[p.status] ?? STATUS_CONFIG.pending;
              return (
                <Link key={p.id} href={`/project/${p.id}`}
                  className="bg-gray-900 border border-gray-800 hover:border-purple-800/50 rounded-xl p-4 flex items-center justify-between transition-colors group">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="text-xl shrink-0">
                      {p.status === "completed" ? "✅" : p.status === "generating" ? "⏳" : p.status === "failed" ? "❌" : "🎥"}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-white group-hover:text-purple-300 transition-colors truncate">{p.title}</div>
                      <div className="text-xs text-gray-500 mt-0.5 flex gap-2 flex-wrap items-center">
                        <span className="bg-gray-800 px-1.5 py-0.5 rounded">{p.niche}</span>
                        <span>{p.duration} min</span>
                        {p._count?.imagePrompts ? <span>🖼️ {p._count.imagePrompts} prompts</span> : null}
                        <span className="text-gray-600">{formatDate(p.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${sc.color} hidden sm:inline`}>{sc.label}</span>
                    <span className="text-gray-600 text-sm">›</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Feature Cards (always shown) ── */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">
          {isNewUser ? "🔧 What you can do" : "📌 Quick Access"}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link href="/new"
            className="bg-gradient-to-br from-purple-900/30 to-gray-900 border border-purple-800/40 rounded-2xl p-5 hover:border-purple-600/60 transition-colors group">
            <div className="text-2xl mb-2">✏️</div>
            <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">Manual Topic</div>
            <div className="text-gray-500 text-sm mt-1">Enter any topic, pick duration, choose style — generate a full asset pack in ~90 seconds.</div>
            <div className="mt-3 text-xs text-purple-400 font-medium group-hover:text-purple-300">Start creating →</div>
          </Link>
          <Link href="/memory"
            className="bg-gradient-to-br from-blue-900/20 to-gray-900 border border-blue-800/30 rounded-2xl p-5 hover:border-blue-600/50 transition-colors group">
            <div className="text-2xl mb-2">🧠</div>
            <div className="font-semibold text-white group-hover:text-blue-300 transition-colors">AI Topic Discovery</div>
            <div className="text-gray-500 text-sm mt-1">RSS feeds auto-discover trending topics. AI ranks them — pick the hottest one to create a video.</div>
            <div className="mt-3 text-xs text-blue-400 font-medium group-hover:text-blue-300">Browse topics →</div>
          </Link>
          <Link href="/settings"
            className="bg-gradient-to-br from-green-900/20 to-gray-900 border border-green-800/30 rounded-2xl p-5 hover:border-green-600/50 transition-colors group">
            <div className="text-2xl mb-2">⚙️</div>
            <div className="font-semibold text-white group-hover:text-green-300 transition-colors">Configure Providers</div>
            <div className="text-gray-500 text-sm mt-1">Add API keys for Groq, Google AI, AWS Bedrock, Notion, Slack, Airtable and more.</div>
            <div className="mt-3 text-xs text-green-400 font-medium group-hover:text-green-300">Open Settings →</div>
          </Link>
        </div>
      </div>

      {/* ── Pipeline diagram ── */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 sm:p-8">
        <h2 className="text-base font-semibold text-white mb-6 text-center">🔁 The Generation Pipeline</h2>
        <div className="grid grid-cols-5 gap-2 sm:gap-4">
          {PIPELINE_STEPS.map((s, i) => (
            <div key={s.label} className="text-center space-y-2 relative">
              {i < PIPELINE_STEPS.length - 1 && (
                <div className="absolute top-4 left-[calc(50%+18px)] right-0 h-px bg-gray-700 hidden sm:block" />
              )}
              <div className="text-2xl sm:text-3xl relative z-10">{s.icon}</div>
              <div className="font-medium text-white text-xs sm:text-sm">{s.label}</div>
              <div className="text-xs text-gray-600 hidden sm:block">{s.desc}</div>
            </div>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3 justify-center text-xs text-gray-600">
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">⚡ Groq (free)</span>
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">🔵 Google Gemini (free)</span>
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">🏠 Ollama (local)</span>
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">☁️ AWS Bedrock</span>
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">🌸 Pollinations images (free)</span>
          <span className="bg-gray-800/60 px-2 py-0.5 rounded-full">🎙️ Edge TTS (free)</span>
        </div>
      </div>
    </div>
  );
}
