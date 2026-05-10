import Parser from "rss-parser";
import { prisma } from "@/lib/prisma";
import { RSS_SEED_FEEDS } from "@/lib/rss-seeds";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const parser = new Parser({
  timeout: 10000,
  headers: { "User-Agent": "AutoTube Factory RSS Reader 1.0" },
});

// ─── Seed default feeds ───────────────────────────────────────────────────────

export async function seedDefaultFeeds(): Promise<void> {
  // Deactivate known-broken legacy feeds (Reddit .rss → 403, Shopify → 404)
  const brokenPatterns = [
    "reddit.com/r/",
    "shopify.com/blog/rss",
    "healthline.com/nutrition/feed",
    "medicalnewstoday.com/rss",
  ];
  for (const pattern of brokenPatterns) {
    await db.rssFeed.updateMany({
      where: {
        url: { contains: pattern },
        // Only deactivate if it's a non-json Reddit URL or known broken
        AND: [
          { NOT: { url: { contains: ".json" } } },
        ],
      },
      data: { isActive: false },
    });
  }

  for (const feed of RSS_SEED_FEEDS) {
    await db.rssFeed.upsert({
      where: { url: feed.url },
      create: {
        url: feed.url,
        name: feed.name,
        niche: feed.niche,
        isActive: true,
        fetchCount: 0,
        errorCount: 0,
      },
      update: { name: feed.name, niche: feed.niche, isActive: true },
    });
  }
}

// ─── Score an RSS item ────────────────────────────────────────────────────────

function scoreItem(title: string, publishedAt: Date | null): number {
  let score = 50;
  if (publishedAt) {
    const h = (Date.now() - publishedAt.getTime()) / 3_600_000;
    if (h < 6) score += 30;
    else if (h < 24) score += 20;
    else if (h < 48) score += 10;
  }
  const l = title.toLowerCase();
  ["2025", "how to", "why", "best", "worst", "secret", "truth", "exposed",
   "money", "free", "easy", "fast", "new", "ai", "hack", "mistake", "fail",
   "beginner", "profit", "simple"].forEach((w) => { if (l.includes(w)) score += 4; });
  if (/\d/.test(title)) score += 8;
  return Math.min(score, 100);
}

async function saveItem(
  feedId: string,
  niche: string,
  title: string,
  url: string,
  description: string | null,
  publishedAt: Date | null
): Promise<boolean> {
  const score = scoreItem(title, publishedAt);
  const result = await db.rssItem.upsert({
    where: { feedId_url: { feedId, url } },
    create: {
      feedId,
      title: title.trim().slice(0, 500),
      description: description?.slice(0, 500) ?? null,
      url,
      publishedAt,
      niche,
      relevanceScore: 50,
      trendScore: score,
    },
    update: { trendScore: score },
    select: { id: true },
  });
  return !!result;
}

// ─── Standard RSS fetch ───────────────────────────────────────────────────────

async function fetchRSS(feed: { id: string; url: string; niche: string }): Promise<number> {
  const parsed = await parser.parseURL(feed.url);
  let count = 0;
  for (const item of (parsed.items ?? []).slice(0, 30)) {
    if (!item.title || !item.link) continue;
    const saved = await saveItem(
      feed.id, feed.niche, item.title, item.link,
      item.contentSnippet?.slice(0, 500) ?? item.summary?.slice(0, 500) ?? null,
      item.pubDate ? new Date(item.pubDate) : null
    );
    if (saved) count++;
  }
  return count;
}

// ─── Reddit JSON API (no auth needed for read-only) ──────────────────────────

async function fetchRedditJSON(feed: { id: string; url: string; niche: string }): Promise<number> {
  const res = await fetch(feed.url, {
    headers: {
      "User-Agent": "AutoTubeFactory/1.0 (youtube automation research tool)",
      "Accept": "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Reddit JSON ${res.status}`);
  const data = await res.json();
  const posts = data?.data?.children ?? [];
  let count = 0;
  for (const { data: post } of posts) {
    if (!post.title || post.is_self === false && !post.url) continue;
    const url = `https://www.reddit.com${post.permalink}`;
    const desc = post.selftext?.slice(0, 500) ?? null;
    const saved = await saveItem(
      feed.id, feed.niche, post.title, url, desc,
      post.created_utc ? new Date(post.created_utc * 1000) : null
    );
    if (saved) count++;
  }
  return count;
}

// ─── DEV.to API (no auth) ────────────────────────────────────────────────────

async function fetchDevTo(feed: { id: string; url: string; niche: string }): Promise<number> {
  const res = await fetch(feed.url, {
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`DEV.to ${res.status}`);
  const articles = await res.json();
  let count = 0;
  for (const a of (Array.isArray(articles) ? articles : []).slice(0, 20)) {
    if (!a.title || !a.url) continue;
    const saved = await saveItem(
      feed.id, feed.niche, a.title, a.url,
      a.description?.slice(0, 500) ?? null,
      a.published_at ? new Date(a.published_at) : null
    );
    if (saved) count++;
  }
  return count;
}

// ─── Detect feed type and dispatch ───────────────────────────────────────────

function detectFeedType(url: string): "rss" | "reddit-json" | "devto" {
  if (url.includes("reddit.com") && url.includes(".json")) return "reddit-json";
  if (url.includes("dev.to/api")) return "devto";
  return "rss";
}

// ─── Fetch a single feed ──────────────────────────────────────────────────────

export async function fetchFeed(feed: { id: string; url: string; niche: string }): Promise<number> {
  const type = detectFeedType(feed.url);
  try {
    let count = 0;
    if (type === "reddit-json") count = await fetchRedditJSON(feed);
    else if (type === "devto") count = await fetchDevTo(feed);
    else count = await fetchRSS(feed);

    await db.rssFeed.update({
      where: { id: feed.id },
      data: { lastFetched: new Date(), fetchCount: { increment: 1 } },
    });
    return count;
  } catch (err) {
    await db.rssFeed.update({
      where: { id: feed.id },
      data: { errorCount: { increment: 1 } },
    });
    console.error(`RSS fetch error for ${feed.url}:`, err);
    return 0;
  }
}

// ─── Fetch all active feeds ───────────────────────────────────────────────────

export async function fetchAllActiveFeeds(): Promise<{ total: number; errors: number }> {
  const feeds = await db.rssFeed.findMany({ where: { isActive: true } });
  let total = 0;
  let errors = 0;
  for (const feed of feeds) {
    const count = await fetchFeed(feed);
    if (count === 0) errors++;
    total += count;
  }
  return { total, errors };
}

// ─── Get recent items for topic discovery ─────────────────────────────────────

export async function getRecentItems(niche?: string, hours = 48) {
  const since = new Date(Date.now() - hours * 3_600_000);
  return db.rssItem.findMany({
    where: { createdAt: { gte: since }, ...(niche ? { niche } : {}) },
    orderBy: { trendScore: "desc" },
    take: 60,
    select: { title: true, description: true, niche: true, trendScore: true },
  });
}
