"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface RssFeed {
  id: string;
  name: string;
  url: string;
  niche: string;
  isActive: boolean;
  lastFetched: string | null;
  fetchCount: number;
  errorCount: number;
  _count?: { items: number };
}

interface RssItem {
  id: string;
  title: string;
  description: string | null;
  url: string;
  niche: string;
  trendScore: number;
  publishedAt: string | null;
  createdAt: string;
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

const NICHES = ["All", "Tech", "Finance", "Health", "Dropshipping", "Lifestyle", "Education", "Fitness", "Business", "Marketing"];

export default function MemoryPage() {
  const [tab, setTab] = useState<"topics" | "items" | "feeds">("topics");
  const [feeds, setFeeds] = useState<RssFeed[]>([]);
  const [items, setItems] = useState<RssItem[]>([]);
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [nicheFilter, setNicheFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [msg, setMsg] = useState("");
  const [addUrl, setAddUrl] = useState("");
  const [addName, setAddName] = useState("");
  const [addNiche, setAddNiche] = useState("Tech");
  const [addLoading, setAddLoading] = useState(false);

  const loadFeeds = useCallback(async () => {
    const d = await fetch("/api/rss/feeds").then((r) => r.json()).catch(() => []);
    setFeeds(Array.isArray(d) ? d : []);
  }, []);

  const loadItems = useCallback(async () => {
    const q = new URLSearchParams({ hours: "72", limit: "100" });
    if (nicheFilter !== "All") q.set("niche", nicheFilter);
    const d = await fetch(`/api/rss/items?${q}`).then((r) => r.json()).catch(() => []);
    setItems(Array.isArray(d) ? d : []);
  }, [nicheFilter]);

  const loadTopics = useCallback(async () => {
    const q = new URLSearchParams();
    if (statusFilter !== "all") q.set("status", statusFilter);
    if (nicheFilter !== "All") q.set("niche", nicheFilter);
    const d = await fetch(`/api/rss/topics?${q}`).then((r) => r.json()).catch(() => []);
    setTopics(Array.isArray(d) ? d : []);
  }, [statusFilter, nicheFilter]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadFeeds(), loadItems(), loadTopics()]).finally(() => setLoading(false));
  }, [loadFeeds, loadItems, loadTopics]);

  async function fetchFeeds(seedFirst = false) {
    setFetching(true);
    setMsg("");
    try {
      const res = await fetch("/api/rss/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: seedFirst }),
      });
      const d = await res.json();
      setMsg(seedFirst
        ? `✅ Seeded default feeds & fetched ${d.total ?? 0} new items`
        : `✅ Fetched ${d.total ?? 0} new items (${d.errors ?? 0} errors)`);
      await loadFeeds();
      await loadItems();
    } catch {
      setMsg("❌ Fetch failed");
    } finally {
      setFetching(false);
    }
  }

  async function generateTopics() {
    setGenerating(true);
    setMsg("");
    try {
      const body = nicheFilter !== "All" ? { niche: nicheFilter } : {};
      const d = await fetch("/api/rss/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then((r) => r.json());
      setMsg(`✅ Generated ${d.generated ?? 0} topic suggestions`);
      await loadTopics();
    } catch {
      setMsg("❌ Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  async function updateTopicStatus(id: string, status: string) {
    await fetch(`/api/rss/topics/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadTopics();
  }

  async function deleteTopic(id: string) {
    await fetch(`/api/rss/topics/${id}`, { method: "DELETE" });
    await loadTopics();
  }

  async function toggleFeed(id: string, isActive: boolean) {
    await fetch(`/api/rss/feeds/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });
    await loadFeeds();
  }

  async function deleteFeed(id: string) {
    if (!confirm("Delete this feed and all its items?")) return;
    await fetch(`/api/rss/feeds/${id}`, { method: "DELETE" });
    await loadFeeds();
    await loadItems();
  }

  async function addFeed(e: React.FormEvent) {
    e.preventDefault();
    if (!addUrl || !addName) return;
    setAddLoading(true);
    try {
      const res = await fetch("/api/rss/feeds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: addUrl, name: addName, niche: addNiche }),
      });
      if (!res.ok) {
        const d = await res.json();
        setMsg("❌ " + (d.error ?? "Failed"));
      } else {
        setAddUrl(""); setAddName("");
        setMsg("✅ Feed added");
        await loadFeeds();
      }
    } finally {
      setAddLoading(false);
    }
  }

  const activeFeedsCount = feeds.filter((f) => f.isActive).length;
  const totalItems = feeds.reduce((acc, f) => acc + (f._count?.items ?? 0), 0);
  const pendingTopics = topics.filter((t) => t.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🧠 Memory</h1>
          <p className="text-gray-400 mt-1">RSS feeds · trending items · AI-discovered topics</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => fetchFeeds(false)}
            disabled={fetching}
            className="bg-blue-600/20 border border-blue-700 text-blue-300 px-4 py-2 rounded-lg text-sm hover:bg-blue-600/30 transition-colors disabled:opacity-50"
          >
            {fetching ? "Fetching..." : "🔄 Fetch All Feeds"}
          </button>
          <button
            onClick={() => fetchFeeds(true)}
            disabled={fetching}
            className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            🌱 Seed + Fetch
          </button>
          <button
            onClick={generateTopics}
            disabled={generating}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-500 transition-colors disabled:opacity-50"
          >
            {generating ? "Generating..." : "✨ Generate Topics"}
          </button>
        </div>
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded-xl text-sm border ${msg.startsWith("✅") ? "bg-green-900/20 border-green-800 text-green-300" : "bg-red-900/20 border-red-800 text-red-300"}`}>
          {msg}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Active Feeds", value: activeFeedsCount, icon: "📡" },
          { label: "Total Feeds", value: feeds.length, icon: "🗂️" },
          { label: "Stored Items", value: totalItems, icon: "📰" },
          { label: "Pending Topics", value: pendingTopics, icon: "💡" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <div className="text-2xl font-bold text-white">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1 bg-gray-900 rounded-xl p-1 border border-gray-800">
          {NICHES.map((n) => (
            <button key={n} onClick={() => setNicheFilter(n)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${nicheFilter === n ? "bg-purple-600 text-white" : "text-gray-400 hover:text-white"}`}>{n}</button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800">
        {[
          { id: "topics", label: "💡 Topic Suggestions", count: topics.length },
          { id: "items", label: "📰 RSS Items", count: items.length },
          { id: "feeds", label: "📡 Feeds", count: feeds.length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === t.id ? "border-purple-500 text-purple-400" : "border-transparent text-gray-500 hover:text-gray-300"}`}
          >
            {t.label} <span className="ml-1 text-xs opacity-60">({t.count})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Topics Tab */}
          {tab === "topics" && (
            <div className="space-y-4">
              <div className="flex gap-2">
                {["pending", "approved", "used", "rejected", "all"].map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${statusFilter === s ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>
                    {s}
                  </button>
                ))}
              </div>
              {topics.length === 0 ? (
                <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
                  <div className="text-4xl mb-3">💡</div>
                  <p className="text-gray-400">No topics yet. Fetch RSS feeds then click "Generate Topics".</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topics.map((t) => (
                    <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-white">{t.title}</div>
                          <div className="text-sm text-gray-500 mt-1">{t.niche} · {t.angle}</div>
                          {t.whyNow && <div className="text-xs text-gray-600 mt-1 italic">"{t.whyNow}"</div>}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className={`text-xs px-2 py-0.5 rounded-full font-bold ${t.score >= 80 ? "bg-green-900/40 text-green-400" : t.score >= 60 ? "bg-yellow-900/40 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>
                            {t.score}
                          </div>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            t.status === "pending" ? "bg-blue-900/40 text-blue-400" :
                            t.status === "approved" ? "bg-green-900/40 text-green-400" :
                            t.status === "used" ? "bg-purple-900/40 text-purple-400" :
                            "bg-gray-800 text-gray-500"
                          }`}>{t.status}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3 flex-wrap">
                        <Link
                          href={`/new?title=${encodeURIComponent(t.title)}&niche=${encodeURIComponent(t.niche)}&topicId=${t.id}`}
                          className="text-xs bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-500 transition-colors"
                        >
                          🚀 Create Video
                        </Link>
                        {t.status === "pending" && (
                          <button onClick={() => updateTopicStatus(t.id, "approved")} className="text-xs bg-green-800/40 text-green-300 border border-green-800 px-3 py-1.5 rounded-lg hover:bg-green-800/60 transition-colors">✓ Approve</button>
                        )}
                        {t.status !== "rejected" && (
                          <button onClick={() => updateTopicStatus(t.id, "rejected")} className="text-xs bg-gray-800 text-gray-400 px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors">✗ Reject</button>
                        )}
                        <button onClick={() => deleteTopic(t.id)} className="text-xs bg-red-900/20 text-red-400 border border-red-900/40 px-3 py-1.5 rounded-lg hover:bg-red-900/40 transition-colors ml-auto">🗑 Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Items Tab */}
          {tab === "items" && (
            <div className="space-y-2">
              {items.length === 0 ? (
                <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
                  <div className="text-4xl mb-3">📰</div>
                  <p className="text-gray-400">No RSS items yet. Click "Fetch All Feeds" or "Seed + Fetch".</p>
                </div>
              ) : (
                items.map((item) => (
                  <div key={item.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-medium text-white hover:text-purple-300 transition-colors line-clamp-1">
                          {item.title}
                        </a>
                        {item.description && <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>}
                        <div className="flex gap-3 mt-1 text-xs text-gray-600">
                          <span>{item.feed?.name ?? item.niche}</span>
                          {item.publishedAt && <span>{new Date(item.publishedAt).toLocaleDateString()}</span>}
                        </div>
                      </div>
                      <div className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0 ${item.trendScore >= 80 ? "bg-green-900/40 text-green-400" : item.trendScore >= 60 ? "bg-yellow-900/40 text-yellow-400" : "bg-gray-800 text-gray-400"}`}>
                        🔥 {item.trendScore}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Feeds Tab */}
          {tab === "feeds" && (
            <div className="space-y-4">
              {/* Add Feed Form */}
              <form onSubmit={addFeed} className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-medium text-gray-300">Add Custom Feed</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input value={addUrl} onChange={(e) => setAddUrl(e.target.value)} placeholder="RSS URL" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm focus:border-purple-500" />
                  <input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Feed name" required className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-600 outline-none text-sm focus:border-purple-500" />
                  <div className="flex gap-2">
                    <select value={addNiche} onChange={(e) => setAddNiche(e.target.value)} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white outline-none text-sm focus:border-purple-500">
                      {NICHES.filter((n) => n !== "All").map((n) => <option key={n} value={n}>{n}</option>)}
                    </select>
                    <button type="submit" disabled={addLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-purple-500 transition-colors disabled:opacity-50">
                      {addLoading ? "..." : "Add"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Feed list */}
              {feeds.length === 0 ? (
                <div className="text-center py-16 bg-gray-900 rounded-2xl border border-gray-800">
                  <p className="text-gray-400">No feeds yet. Click "Seed + Fetch" to load 19 default feeds.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {feeds.map((feed) => (
                    <div key={feed.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${feed.isActive ? "border-gray-800" : "border-gray-800/50 opacity-60"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white text-sm">{feed.name}</span>
                            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full">{feed.niche}</span>
                          </div>
                          <div className="text-xs text-gray-600 mt-0.5 truncate">{feed.url}</div>
                          <div className="flex gap-3 mt-1 text-xs text-gray-600">
                            <span>{feed._count?.items ?? 0} items</span>
                            <span>{feed.fetchCount} fetches</span>
                            {feed.errorCount > 0 && <span className="text-red-500">{feed.errorCount} errors</span>}
                            {feed.lastFetched && <span>last: {new Date(feed.lastFetched).toLocaleDateString()}</span>}
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => toggleFeed(feed.id, feed.isActive)}
                            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${feed.isActive ? "border-green-800 text-green-400 hover:bg-green-900/20" : "border-gray-700 text-gray-500 hover:bg-gray-800"}`}
                          >
                            {feed.isActive ? "✓ Active" : "○ Inactive"}
                          </button>
                          <button
                            onClick={async () => {
                              setMsg("");
                              const d = await fetch("/api/rss/fetch", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ feedId: feed.id }),
                              }).then((r) => r.json());
                              setMsg(`✅ Fetched ${d.newItems ?? 0} new items from ${feed.name}`);
                              await loadFeeds();
                              await loadItems();
                            }}
                            className="text-xs border border-blue-800 text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-900/20 transition-colors"
                          >
                            Fetch
                          </button>
                          <button onClick={() => deleteFeed(feed.id)} className="text-xs border border-red-900/40 text-red-400 px-3 py-1.5 rounded-lg hover:bg-red-900/20 transition-colors">
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
