import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// GET /api/rss/feeds
export async function GET() {
  try {
    const feeds = await db.rssFeed.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { items: true } } },
    });
    return NextResponse.json(feeds);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/rss/feeds
export async function POST(req: NextRequest) {
  try {
    const { url, name, niche } = await req.json();
    if (!url || !name || !niche) {
      return NextResponse.json({ error: "url, name, niche required" }, { status: 400 });
    }
    const feed = await db.rssFeed.create({
      data: { url, name, niche, isActive: true, fetchCount: 0, errorCount: 0 },
    });
    return NextResponse.json(feed, { status: 201 });
  } catch (e: any) {
    if (e?.code === "P2002") {
      return NextResponse.json({ error: "Feed URL already exists" }, { status: 409 });
    }
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
