import { NextRequest, NextResponse } from "next/server";
import { fetchFeed, fetchAllActiveFeeds, seedDefaultFeeds } from "@/lib/rss-fetcher";
import { prisma } from "@/lib/prisma";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// POST /api/rss/fetch — trigger fetch
// body: {} → fetch all active feeds
// body: { feedId: "..." } → fetch single feed
// body: { seed: true } → seed default feeds first then fetch
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    if (body.seed) {
      await seedDefaultFeeds();
    }

    if (body.feedId) {
      const feed = await db.rssFeed.findUnique({ where: { id: body.feedId } });
      if (!feed) return NextResponse.json({ error: "Feed not found" }, { status: 404 });
      const count = await fetchFeed(feed);
      return NextResponse.json({ newItems: count });
    }

    const result = await fetchAllActiveFeeds();
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
