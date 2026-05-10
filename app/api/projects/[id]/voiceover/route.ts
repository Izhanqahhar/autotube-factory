import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { VOICEOVER_SYSTEM, voiceoverUserPrompt } from "@/lib/prompts";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const vo = await prisma.voiceover.findUnique({ where: { projectId: id } });
  if (!vo) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vo);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const scriptRec = await prisma.script.findUnique({ where: { projectId: id } });
    if (!scriptRec) return NextResponse.json({ error: "Script not found" }, { status: 400 });
    const modelId = project.modelId ?? DEFAULT_MODEL_ID;

    await prisma.project.update({ where: { id }, data: { currentStep: "voiceover", status: "generating" } });

    const { data: raw } = await callWithFallbackJSON<{
      fullText: string;
      segments: { text: string; timeStart: number; timeEnd: number }[];
      wordCount: number;
      estimatedDuration: number;
    }>(VOICEOVER_SYSTEM, voiceoverUserPrompt(scriptRec.fullScript, project.duration, project.tone), 4096, modelId);

    const vo = await prisma.voiceover.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        fullText: raw.fullText ?? "",
        segments: JSON.stringify(raw.segments ?? []),
        wordCount: raw.wordCount ?? 0,
        estimatedDuration: raw.estimatedDuration ?? 0,
      },
      update: {
        fullText: raw.fullText ?? "",
        segments: JSON.stringify(raw.segments ?? []),
        wordCount: raw.wordCount ?? 0,
        estimatedDuration: raw.estimatedDuration ?? 0,
      },
    });

    await prisma.project.update({ where: { id }, data: { currentStep: "done", status: "completed" } });
    return NextResponse.json(vo);
  } catch (e) {
    await prisma.project.update({
      where: { id: (await params).id },
      data: { status: "failed", errorMessage: String(e) },
    }).catch(() => {});
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const vo = await prisma.voiceover.update({ where: { projectId: id }, data: body });
    return NextResponse.json(vo);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
