import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTopicSuggestions } from "@/lib/topic-discoverer";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// GET /api/rss/topics?status=pending&niche=Tech
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") ?? undefined;
    const niche = searchParams.get("niche") ?? undefined;

    const topics = await db.topicSuggestion.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(niche ? { niche } : {}),
      },
      orderBy: { score: "desc" },
    });

    return NextResponse.json(topics);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/rss/topics — generate new suggestions via LLM
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const niche = body.niche ?? undefined;
    const count = await generateTopicSuggestions(niche);
    return NextResponse.json({ generated: count });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
