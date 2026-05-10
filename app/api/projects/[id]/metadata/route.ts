import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { DEFAULT_MODEL_ID } from "@/lib/models";

interface YouTubeMetadata {
  titles: string[];          // 5 title variants
  description: string;       // full YouTube description
  tags: string[];            // 30 tags
  pinnedComment: string;     // first comment to pin
  hashtags: string[];        // 5 hashtags for description footer
  category: string;          // YouTube category
  chapterMarkers?: string[]; // optional timestamp chapter markers
}

const METADATA_SYSTEM = `You are a YouTube SEO expert. Generate optimized YouTube metadata that maximizes click-through rate and discoverability. Always return valid JSON with exactly the specified fields.`;

function metadataUserPrompt(
  title: string,
  niche: string,
  audience: string,
  duration: number,
  scriptSummary: string,
  scenes: string
): string {
  return `Generate YouTube metadata for this video:

Title: ${title}
Niche: ${niche}
Target Audience: ${audience}
Duration: ${duration} minutes
Script Summary: ${scriptSummary}
Scenes: ${scenes}

Return JSON with:
- titles: array of exactly 5 title variants (catchy, SEO-optimized, varying hooks: curiosity, controversy, list, how-to, story)
- description: 300-500 word YouTube description (include keywords naturally, call-to-action, social links placeholders like [INSTAGRAM_LINK])
- tags: array of exactly 30 relevant SEO tags (mix of broad and specific)
- pinnedComment: engaging first comment to pin (150-200 chars, call-to-action)
- hashtags: array of exactly 5 hashtags for the description footer
- category: best YouTube category (e.g. "Education", "Science & Technology", "Entertainment")
- chapterMarkers: array of chapter timestamps if video is 5+ minutes (format: "0:00 Introduction", "1:30 Main Topic")`;
}

// GET /api/projects/[id]/metadata — return saved metadata
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const metadata = project.metadataJson
      ? JSON.parse(project.metadataJson as string)
      : null;
    return NextResponse.json({ metadata });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/projects/[id]/metadata — generate YouTube metadata via LLM
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: {
        script: true,
        research: true,
        scenes: { orderBy: { sceneNumber: "asc" } },
      },
    });

    const modelId = project.modelId ?? DEFAULT_MODEL_ID;
    const scriptSummary = project.research?.summary ?? project.script?.body?.slice(0, 500) ?? "";
    const scenesText = (project.scenes ?? [])
      .slice(0, 8)
      .map((s) => `${s.sceneNumber}. ${s.title}`)
      .join(", ");

    const { data: metadata } = await callWithFallbackJSON<YouTubeMetadata>(
      METADATA_SYSTEM,
      metadataUserPrompt(
        project.script?.title ?? project.title,
        project.niche,
        project.audience,
        project.duration,
        scriptSummary,
        scenesText
      ),
      4096,
      modelId
    );

    // Ensure arrays are properly formed
    const safeMetadata: YouTubeMetadata = {
      titles: Array.isArray(metadata.titles) ? metadata.titles.slice(0, 5) : [project.title],
      description: metadata.description ?? "",
      tags: Array.isArray(metadata.tags) ? metadata.tags.slice(0, 30) : [],
      pinnedComment: metadata.pinnedComment ?? "",
      hashtags: Array.isArray(metadata.hashtags) ? metadata.hashtags.slice(0, 5) : [],
      category: metadata.category ?? "Education",
      chapterMarkers: Array.isArray(metadata.chapterMarkers) ? metadata.chapterMarkers : [],
    };

    await prisma.project.update({
      where: { id },
      data: {
        metadataJson: JSON.stringify(safeMetadata),
      } as Parameters<typeof prisma.project.update>[0]["data"],
    });

    return NextResponse.json({ ok: true, metadata: safeMetadata });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
