import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { SCENES_SYSTEM, scenesUserPrompt } from "@/lib/prompts";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const scenes = await prisma.scene.findMany({
    where: { projectId: id },
    orderBy: { sceneNumber: "asc" },
  });
  return NextResponse.json(scenes);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const scriptRec = await prisma.script.findUnique({ where: { projectId: id } });
    if (!scriptRec) return NextResponse.json({ error: "Script not found — generate script first" }, { status: 400 });
    const modelId = project.modelId ?? DEFAULT_MODEL_ID;

    await prisma.project.update({ where: { id }, data: { currentStep: "scenes", status: "generating" } });

    const { data: raw } = await callWithFallbackJSON<{
      sceneNumber: number;
      title: string;
      content: string;
      duration: number;
      beatType: string;
      timeStart: number;
      timeEnd: number;
    }[]>(SCENES_SYSTEM, scenesUserPrompt(scriptRec.fullScript, project.duration), 4096, modelId);

    await prisma.scene.deleteMany({ where: { projectId: id } });
    await prisma.scene.createMany({
      data: raw.map((s) => ({
        projectId: id,
        sceneNumber: s.sceneNumber,
        title: s.title,
        content: s.content,
        duration: s.duration,
        beatType: s.beatType,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
      })),
    });

    const scenes = await prisma.scene.findMany({ where: { projectId: id }, orderBy: { sceneNumber: "asc" } });
    await prisma.project.update({ where: { id }, data: { currentStep: "image-prompts", status: "completed" } });
    return NextResponse.json(scenes);
  } catch (e) {
    await prisma.project.update({
      where: { id: (await params).id },
      data: { status: "failed", errorMessage: String(e) },
    }).catch(() => {});
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
