import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { IMAGE_PROMPTS_SYSTEM, imagePromptsUserPrompt, getPromptCount } from "@/lib/prompts";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const prompts = await prisma.imagePrompt.findMany({
    where: { projectId: id },
    orderBy: { promptNumber: "asc" },
  });
  return NextResponse.json(prompts);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const scriptRec = await prisma.script.findUnique({ where: { projectId: id } });
    const research = await prisma.research.findUnique({ where: { projectId: id } });
    const scenes = await prisma.scene.findMany({ where: { projectId: id }, orderBy: { sceneNumber: "asc" } });

    if (!scriptRec) return NextResponse.json({ error: "Script not found" }, { status: 400 });

    await prisma.project.update({ where: { id }, data: { currentStep: "image-prompts", status: "generating" } });

    const promptCount = getPromptCount(project.duration);
    const scriptSections = scenes
      .map((s: { sceneNumber: number; title: string; content: string }) => `[${s.sceneNumber}] ${s.title}: ${s.content.slice(0, 80)}`)
      .join("\n");
    const summary = research?.summary ?? project.title;

    const result = await callWithFallbackJSON<{
      promptNumber: number;
      timeStart: number;
      timeEnd: number;
      minuteBucket: number;
      beatIndex: number;
      title: string;
      shortPrompt: string;
      altPrompt?: string;
      imageType: string;
    }[]>(
      IMAGE_PROMPTS_SYSTEM,
      imagePromptsUserPrompt(project.title, project.duration, project.style, project.tone, project.niche, summary, scriptSections),
      8192,
      DEFAULT_MODEL_ID
    );
    const raw = result.data;

    await prisma.imagePrompt.deleteMany({ where: { projectId: id } });
    await prisma.imagePrompt.createMany({
      data: raw.map((p) => ({
        projectId: id,
        promptNumber: p.promptNumber,
        timeStart: p.timeStart,
        timeEnd: p.timeEnd,
        minuteBucket: p.minuteBucket,
        beatIndex: p.beatIndex,
        title: p.title,
        shortPrompt: p.shortPrompt,
        altPrompt: p.altPrompt ?? null,
        imageType: p.imageType,
        status: "pending",
      })),
    });

    const prompts = await prisma.imagePrompt.findMany({ where: { projectId: id }, orderBy: { promptNumber: "asc" } });
    await prisma.project.update({ where: { id }, data: { currentStep: "voiceover" } });
    return NextResponse.json(prompts);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
