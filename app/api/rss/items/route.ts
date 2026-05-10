import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// GET /api/rss/items?niche=Tech&hours=48&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const niche = searchParams.get("niche") ?? undefined;
    const hours = Number(searchParams.get("hours") ?? "48");
    const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 200);

    const since = new Date(Date.now() - hours * 3_600_000);

    const items = await db.rssItem.findMany({
      where: {
        createdAt: { gte: since },
        ...(niche ? { niche } : {}),
      },
      orderBy: { trendScore: "desc" },
      take: limit,
      include: { feed: { select: { name: true, niche: true } } },
    });

    return NextResponse.json(items);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/rss/items — bulk clear old items
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const days = Number(searchParams.get("days") ?? "7");
    const before = new Date(Date.now() - days * 86_400_000);
    const result = await db.rssItem.deleteMany({ where: { createdAt: { lt: before } } });
    return NextResponse.json({ deleted: result.count });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
