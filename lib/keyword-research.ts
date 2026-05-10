/**
 * Free keyword research tools — no API keys needed for most.
 */

// ─── YouTube Autocomplete (no key!) ──────────────────────────────────────────

export async function getYouTubeAutocomplete(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoTubeFactory/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data[1]) ? data[1] : []).slice(0, 10) as string[];
  } catch {
    return [];
  }
}

// ─── Google Autocomplete (no key!) ───────────────────────────────────────────

export async function getGoogleAutocomplete(query: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; AutoTubeFactory/1.0)" },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (Array.isArray(data[1]) ? data[1] : []).slice(0, 10) as string[];
  } catch {
    return [];
  }
}

// ─── Wikipedia summary (no key!) ─────────────────────────────────────────────

export async function getWikipediaSummary(topic: string): Promise<string> {
  try {
    const encoded = encodeURIComponent(topic.replace(/ /g, "_"));
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encoded}`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AutoTubeFactory/1.0 (research tool)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return "";
    const data = await res.json();
    return data.extract ?? "";
  } catch {
    return "";
  }
}

// ─── arXiv research papers (no key!) ─────────────────────────────────────────

export interface ArxivPaper {
  title: string;
  summary: string;
  published: string;
  authors: string[];
}

export async function searchArxiv(query: string, maxResults = 5): Promise<ArxivPaper[]> {
  try {
    const url = `https://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=${maxResults}&sortBy=relevance`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const xml = await res.text();

    const entries = xml.match(/<entry>([\s\S]*?)<\/entry>/g) ?? [];
    return entries.map((e) => {
      const title = (e.match(/<title>([\s\S]*?)<\/title>/) ?? [])[1]?.trim() ?? "";
      const summary = (e.match(/<summary>([\s\S]*?)<\/summary>/) ?? [])[1]?.trim().slice(0, 300) ?? "";
      const published = (e.match(/<published>([\s\S]*?)<\/published>/) ?? [])[1]?.trim() ?? "";
      const authors = [...e.matchAll(/<name>([\s\S]*?)<\/name>/g)].map((m) => m[1]).slice(0, 3);
      return { title, summary, published, authors };
    });
  } catch {
    return [];
  }
}

// ─── HackerNews top stories (no key!) ────────────────────────────────────────

export async function getHackerNewsTop(limit = 10): Promise<{ title: string; url: string; score: number }[]> {
  try {
    const idsRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json", { signal: AbortSignal.timeout(5000) });
    if (!idsRes.ok) return [];
    const ids: number[] = await idsRes.json();

    const stories = await Promise.all(
      ids.slice(0, limit).map((id) =>
        fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`, { signal: AbortSignal.timeout(3000) })
          .then((r) => r.json())
          .catch(() => null)
      )
    );

    return stories
      .filter((s) => s && s.title)
      .map((s) => ({ title: s.title, url: s.url ?? `https://news.ycombinator.com/item?id=${s.id}`, score: s.score ?? 0 }));
  } catch {
    return [];
  }
}

// ─── All-in-one research enrichment ──────────────────────────────────────────

export async function enrichResearch(topic: string, niche: string): Promise<{
  wikiSummary: string;
  youtubeKeywords: string[];
  googleKeywords: string[];
  arxivPapers: ArxivPaper[];
}> {
  const [wikiSummary, youtubeKeywords, googleKeywords, arxivPapers] = await Promise.allSettled([
    getWikipediaSummary(topic),
    getYouTubeAutocomplete(`${topic} ${niche}`),
    getGoogleAutocomplete(`${topic} how to`),
    niche === "Tech" || niche === "Health" ? searchArxiv(topic, 3) : Promise.resolve([]),
  ]);

  return {
    wikiSummary: wikiSummary.status === "fulfilled" ? wikiSummary.value : "",
    youtubeKeywords: youtubeKeywords.status === "fulfilled" ? youtubeKeywords.value : [],
    googleKeywords: googleKeywords.status === "fulfilled" ? googleKeywords.value : [],
    arxivPapers: arxivPapers.status === "fulfilled" ? arxivPapers.value : [],
  };
}
