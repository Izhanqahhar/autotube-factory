import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        research: true,
        script: true,
        scenes: { orderBy: { sceneNumber: "asc" } },
        imagePrompts: { orderBy: { promptNumber: "asc" } },
        voiceover: true,
      },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Build export object with parsed JSON fields
    const exportData = {
      project: {
        id: project.id,
        title: project.title,
        niche: project.niche,
        audience: project.audience,
        duration: project.duration,
        style: project.style,
        tone: project.tone,
        notes: project.notes,
        status: project.status,
        createdAt: project.createdAt,
      },
      research: project.research
        ? {
            summary: project.research.summary,
            claims: JSON.parse(project.research.claims),
            sources: JSON.parse(project.research.sources),
            hooks: JSON.parse(project.research.hooks),
            statistics: JSON.parse(project.research.statistics),
          }
        : null,
      script: project.script
        ? {
            title: project.script.title,
            hook: project.script.hook,
            body: project.script.body,
            cta: project.script.cta,
            fullScript: project.script.fullScript,
            wordCount: project.script.wordCount,
            qualityScore: project.script.qualityScore,
          }
        : null,
      scenes: project.scenes,
      imagePrompts: project.imagePrompts,
      voiceover: project.voiceover
        ? {
            fullText: project.voiceover.fullText,
            segments: JSON.parse(project.voiceover.segments),
            wordCount: project.voiceover.wordCount,
            estimatedDuration: project.voiceover.estimatedDuration,
          }
        : null,
      exportedAt: new Date().toISOString(),
    };

    return NextResponse.json(exportData, {
      headers: {
        "Content-Disposition": `attachment; filename="project-${id}-export.json"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
