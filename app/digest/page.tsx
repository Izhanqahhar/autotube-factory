"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

interface DigestItem {
  id: string;
  title: string;
  niche: string;
  trendScore: number;
  url: string;
  publishedAt: string | null;
  feed?: { name: string };
}

interface TopicSuggestion {
  id: string;
  title: string;
  niche: string;
  angle: string;
  whyNow: string;
  score: number;
  status: string;
  createdAt: string;
}

const NICHES = ["All", "Tech", "Finance", "Business", "Dropshipping", "Health", "Marketing"];

export default function DigestPage() {
  const [items, setItems] = useState<DigestItem[]>([]);
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [nicheFilter, setNicheFilter] = useState("All");
  const [generating, setGenerating] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    load();
  }, [nicheFilter]);

  async function load() {
    setLoading(true);
    const q = new URLSearchParams({ hours: "24", limit: "50" });
    if (nicheFilter !== "All") q.set("niche", nicheFilter);

    const tq = new URLSearchParams({ status: "pending" });
    if (nicheFilter !== "All") tq.set("niche", nicheFilter);

    const [itemsData, topicsData] = await Promise.all([
      fetch(`/api/rss/items?${q}`).then((r) => r.json()).catch(() => []),
      fetch(`/api/rss/topics?${tq}`).then((r) => r.json()).catch(() => []),
    ]);
    setItems(Array.isArray(itemsData) ? itemsData : []);
    setTopics(Array.isArray(topicsData) ? topicsData : []);
    setLoading(false);
  }

  async function fetchFeeds() {
    setFetching(true);
    setMsg("");
    const d = await fetch("/api/rss/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    }).then((r) => r.json()).catch(() => ({ total: 0 }));
    setMsg(`✅ Fetched ${d.total ?? 0} new items`);
    setFetching(false);
    await load();
  }

  async function generateTopics() {
    setGenerating(true);
    setMsg("");
    const body = nicheFilter !== "All" ? { niche: nicheFilter } : {};
    const d = await fetch("/api/rss/topics", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json()).catch(() => ({ generated: 0 }));
    setMsg(`✅ Generated ${d.generated ?? 0} topic suggestions`);
    setGenerating(false);
    await load();
  }

  // Group items by niche
  const byNiche: Record<string, DigestItem[]> = {};
  for (const item of items) {
    if (!byNiche[item.niche]) byNiche[item.niche] = [];
    byNiche[item.niche].push(item);
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const topTopic = topics[0];

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">📊 Daily Digest</h1>
          <p className="text-gray-500 mt-1">{today}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={fetchFeeds} disabled={fetching} className="bg-blue-600/20 border border-blue-700 text-blue-300 px-4 py-2 rounded-lg text-sm hover:bg-blue-600/30 transition-colors disabled:opacity-50">
            {fetching ? "Fetching..." : "🔄 Refresh Feeds"}
          </button>
          <button onClick={generateTopics} disabled={generating} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-500 transition-colors disabled:opacity-50">
            {generating ? "Generating..." : "✨ Generate Topics"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${msg.startsWith("✅") ? "bg-green-900/20 border-green-800 text-green-300" : "bg-red-900/20 border-red-800 text-red-300"}`}>{msg}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "New Articles (24h)", value: items.length, icon: "📰" },
          { label: "Topic Ideas", value: topics.length, icon: "💡" },
          { label: "Niches Covered", value: Object.keys(byNiche).length, icon: "🗂️" },
          { label: "Top Trend Score", value: items[0]?.trendScore ?? 0, icon: "🔥" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{loading ? "—" : s.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Topic of the Day */}
      {topTopic && (
        <div className="bg-gradient-to-r from-purple-900/30 to-gray-900 border border-purple-700/50 rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="text-xs text-purple-400 font-medium uppercase tracking-wide mb-2">💡 Top Topic of the Day</div>
              <div className="text-xl font-bold text-white">{topTopic.title}</div>
              <div className="text-sm text-gray-400 mt-1">{topTopic.niche} · {topTopic.angle}</div>
              {topTopic.whyNow && <div className="text-sm text-gray-500 mt-2 italic">"{topTopic.whyNow}"</div>}
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className={`text-lg font-bold px-3 py-1 rounded-full ${topTopic.score >= 80 ? "bg-green-900/40 text-green-400" : "bg-yellow-900/40 text-yellow-400"}`}>
                {topTopic.score}/100
              </div>
              <Link
                href={`/new?title=${encodeURIComponent(topTopic.title)}&niche=${encodeURIComponent(topTopic.niche)}&topicId=${topTopic.id}`}
                className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2.5 rounded-xl font-medium text-sm transition-colors"
              >
                🚀 Create Now
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Niche filter */}
      <div className="flex gap-1 flex-wrap">
        {NICHES.map((n) => (
          <button key={n} onClick={() => setNicheFilter(n)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${nicheFilter === n ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>{n}</button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading digest...</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Topics column */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              💡 Topic Suggestions <span className="text-sm text-gray-600 font-normal">({topics.length})</span>
            </h2>
            {topics.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
                No topics yet — click "Generate Topics" above.
              </div>
            ) : (
              topics.slice(0, 8).map((t) => (
                <div key={t.id} className="bg-gray-900 border border-gray-800 hover:border-purple-700/50 rounded-xl p-4 transition-colors group">
                  <div className="flex items-start gap-3">
                    <div className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${t.score >= 80 ? "bg-green-900/40 text-green-400" : t.score >= 60 ? "bg-yellow-900/40 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>
                      {t.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm line-clamp-2">{t.title}</div>
                      <div className="text-xs text-gray-600 mt-0.5">{t.niche}</div>
                    </div>
                    <Link
                      href={`/new?title=${encodeURIComponent(t.title)}&niche=${encodeURIComponent(t.niche)}&topicId=${t.id}`}
                      className="text-xs bg-purple-600/20 text-purple-300 border border-purple-800 px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                    >
                      Use →
                    </Link>
                  </div>
                </div>
              ))
            )}
            {topics.length > 0 && (
              <Link href="/memory" className="block text-center text-sm text-purple-400 hover:text-purple-300 py-2">
                View all {topics.length} topics in Memory →
              </Link>
            )}
          </div>

          {/* Trending Articles column */}
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              🔥 Trending Now <span className="text-sm text-gray-600 font-normal">({items.length} articles)</span>
            </h2>
            {items.length === 0 ? (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 text-center text-gray-500 text-sm">
                No recent articles — click "Refresh Feeds" to fetch.
              </div>
            ) : (
              items.slice(0, 10).map((item) => (
                <a
                  key={item.id}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-3 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white hover:text-purple-300 line-clamp-2">{item.title}</div>
                      <div className="flex gap-2 mt-1 text-xs text-gray-600">
                        <span>{item.feed?.name ?? item.niche}</span>
                        {item.publishedAt && <span>· {new Date(item.publishedAt).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <div className={`text-xs font-bold shrink-0 ${item.trendScore >= 80 ? "text-green-400" : item.trendScore >= 60 ? "text-yellow-400" : "text-gray-500"}`}>
                      {item.trendScore}🔥
                    </div>
                  </div>
                </a>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
