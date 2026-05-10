import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// GET /api/rss/feeds/[id]
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const feed = await db.rssFeed.findUnique({
      where: { id },
      include: {
        items: { orderBy: { trendScore: "desc" }, take: 20 },
        _count: { select: { items: true } },
      },
    });
    if (!feed) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(feed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PUT /api/rss/feeds/[id] — toggle active or rename
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const feed = await db.rssFeed.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.niche !== undefined && { niche: body.niche }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    return NextResponse.json(feed);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/rss/feeds/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.rssItem.deleteMany({ where: { feedId: id } });
    await db.rssFeed.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
