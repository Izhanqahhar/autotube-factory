export interface RssSeedFeed {
  name: string;
  url: string;
  niche: string;
  feedType?: "rss" | "reddit-json" | "hn" | "devto";
}

export const RSS_SEED_FEEDS: RssSeedFeed[] = [
  // ─── Dropshipping ──────────────────────────────────────────────────────────
  { name: "Practical Ecommerce", url: "https://www.practicalecommerce.com/feed", niche: "Dropshipping" },
  { name: "Google News: Dropshipping", url: "https://news.google.com/rss/search?q=dropshipping+2025&hl=en&gl=US&ceid=US:en", niche: "Dropshipping" },
  { name: "Google News: Ecommerce 2025", url: "https://news.google.com/rss/search?q=ecommerce+tips+2025&hl=en&gl=US&ceid=US:en", niche: "Dropshipping" },
  { name: "Reddit: r/dropship (JSON)", url: "https://www.reddit.com/r/dropship/hot.json?limit=25", niche: "Dropshipping", feedType: "reddit-json" },
  { name: "Reddit: r/ecommerce (JSON)", url: "https://www.reddit.com/r/ecommerce/hot.json?limit=25", niche: "Dropshipping", feedType: "reddit-json" },

  // ─── Tech ──────────────────────────────────────────────────────────────────
  { name: "TechCrunch", url: "https://techcrunch.com/feed/", niche: "Tech" },
  { name: "The Verge", url: "https://www.theverge.com/rss/index.xml", niche: "Tech" },
  { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index", niche: "Tech" },
  { name: "Google News: AI Tools 2025", url: "https://news.google.com/rss/search?q=AI+tools+2025&hl=en&gl=US&ceid=US:en", niche: "Tech" },
  { name: "Hacker News Top", url: "https://news.ycombinator.com/rss", niche: "Tech" },
  { name: "DEV.to Trending", url: "https://dev.to/api/articles?top=7&per_page=20", niche: "Tech", feedType: "devto" },
  { name: "Reddit: r/learnprogramming (JSON)", url: "https://www.reddit.com/r/learnprogramming/hot.json?limit=25", niche: "Tech", feedType: "reddit-json" },
  { name: "Reddit: r/artificial (JSON)", url: "https://www.reddit.com/r/artificial/hot.json?limit=25", niche: "Tech", feedType: "reddit-json" },

  // ─── Finance ──────────────────────────────────────────────────────────────
  { name: "Google News: Investing Beginners", url: "https://news.google.com/rss/search?q=investing+beginners+2025&hl=en&gl=US&ceid=US:en", niche: "Finance" },
  { name: "Google News: Side Hustle", url: "https://news.google.com/rss/search?q=side+hustle+2025&hl=en&gl=US&ceid=US:en", niche: "Finance" },
  { name: "Reddit: r/personalfinance (JSON)", url: "https://www.reddit.com/r/personalfinance/hot.json?limit=25", niche: "Finance", feedType: "reddit-json" },
  { name: "Reddit: r/investing (JSON)", url: "https://www.reddit.com/r/investing/hot.json?limit=25", niche: "Finance", feedType: "reddit-json" },

  // ─── Business ─────────────────────────────────────────────────────────────
  { name: "Entrepreneur", url: "https://www.entrepreneur.com/latest.rss", niche: "Business" },
  { name: "Google News: Make Money Online", url: "https://news.google.com/rss/search?q=make+money+online+2025&hl=en&gl=US&ceid=US:en", niche: "Business" },
  { name: "Reddit: r/entrepreneur (JSON)", url: "https://www.reddit.com/r/Entrepreneur/hot.json?limit=25", niche: "Business", feedType: "reddit-json" },
  { name: "Reddit: r/SideProject (JSON)", url: "https://www.reddit.com/r/SideProject/hot.json?limit=25", niche: "Business", feedType: "reddit-json" },

  // ─── Health ───────────────────────────────────────────────────────────────
  { name: "Google News: Weight Loss", url: "https://news.google.com/rss/search?q=weight+loss+2025&hl=en&gl=US&ceid=US:en", niche: "Health" },
  { name: "Google News: Fitness Tips", url: "https://news.google.com/rss/search?q=fitness+tips+2025&hl=en&gl=US&ceid=US:en", niche: "Health" },
  { name: "Reddit: r/Fitness (JSON)", url: "https://www.reddit.com/r/Fitness/hot.json?limit=25", niche: "Health", feedType: "reddit-json" },

  // ─── Marketing ────────────────────────────────────────────────────────────
  { name: "Google News: Digital Marketing", url: "https://news.google.com/rss/search?q=digital+marketing+2025&hl=en&gl=US&ceid=US:en", niche: "Marketing" },
  { name: "Reddit: r/marketing (JSON)", url: "https://www.reddit.com/r/marketing/hot.json?limit=25", niche: "Marketing", feedType: "reddit-json" },
];
