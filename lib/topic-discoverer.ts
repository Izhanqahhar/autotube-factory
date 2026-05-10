import { prisma } from "@/lib/prisma";
import { callLLMJSON } from "@/lib/llm-router";
import { getRecentItems } from "@/lib/rss-fetcher";
import { DEFAULT_MODEL_ID } from "@/lib/models";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

const TOPIC_SYSTEM = `You are a YouTube content strategist. 
Analyze recent news and suggest video topics that would get high views.
Always return valid JSON array only — no markdown outside the JSON.`;

interface RawSuggestion {
  title: string;
  niche: string;
  angle: string;
  whyNow: string;
  score: number;
}

export async function generateTopicSuggestions(niche?: string): Promise<number> {
  const items = await getRecentItems(niche, 48);
  if (items.length < 3) return 0;

  const articleList = (items as Array<{ niche: string; title: string; description: string | null; trendScore: number }>)
    .slice(0, 25)
    .map((i, idx) => `${idx + 1}. [${i.niche}] ${i.title}${i.description ? " — " + i.description.slice(0, 80) : ""}`)
    .join("\n");

  const modelId = DEFAULT_MODEL_ID;

  const suggestions = await callLLMJSON<RawSuggestion[]>(
    TOPIC_SYSTEM,
    `Analyze these recent articles and suggest 5-8 YouTube video topics that would get high views.
${niche ? `Focus on the "${niche}" niche.` : "Mix across niches."}

Recent articles:
${articleList}

Return JSON array:
[{
  "title": "YouTube video title (clickbait but honest)",
  "niche": "niche name",
  "angle": "unique angle or hook",
  "whyNow": "why this topic is timely right now (1-2 sentences)",
  "score": 85
}]`,
    modelId,
    2048
  );

  let saved = 0;
  for (const s of Array.isArray(suggestions) ? suggestions : []) {
    if (!s.title || !s.niche) continue;
    await db.topicSuggestion.create({
      data: {
        title: s.title,
        niche: s.niche,
        angle: s.angle ?? "",
        whyNow: s.whyNow ?? "",
        score: Number(s.score) || 70,
        status: "pending",
      },
    });
    saved++;
  }

  return saved;
}
