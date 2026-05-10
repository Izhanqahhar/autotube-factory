import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateThumbnail } from "@/lib/thumbnail-generator";

// POST /api/thumbnails/generate
// body: { projectId, subtitle?, style?, bgPrompt? }
export async function POST(req: NextRequest) {
  try {
    const { projectId, subtitle, style, bgPrompt } = await req.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { script: true },
    });

    const title = project.script?.title ?? project.title;

    const result = await generateThumbnail(projectId, {
      title,
      subtitle: subtitle ?? undefined,
      style: style ?? "dramatic",
      bgPrompt: bgPrompt ?? undefined,
    });

    // Update project record
    await prisma.project.update({
      where: { id: projectId },
      data: {
        thumbnailPath: result.localPath,
        thumbnailUrl: result.url,
      } as Parameters<typeof prisma.project.update>[0]["data"],
    });

    return NextResponse.json({ ok: true, url: result.url, path: result.localPath });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
