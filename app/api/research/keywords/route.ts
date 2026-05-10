import { NextRequest, NextResponse } from "next/server";
import { getYouTubeAutocomplete, getGoogleAutocomplete, getWikipediaSummary, enrichResearch } from "@/lib/keyword-research";

// GET /api/research/keywords?q=topic&type=youtube|google|wiki|all&niche=Tech
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") ?? "";
  const type = searchParams.get("type") ?? "all";
  const niche = searchParams.get("niche") ?? "Tech";

  if (!q) return NextResponse.json({ error: "q required" }, { status: 400 });

  try {
    if (type === "youtube") return NextResponse.json(await getYouTubeAutocomplete(q));
    if (type === "google") return NextResponse.json(await getGoogleAutocomplete(q));
    if (type === "wiki") return NextResponse.json({ summary: await getWikipediaSummary(q) });
    return NextResponse.json(await enrichResearch(q, niche));
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
