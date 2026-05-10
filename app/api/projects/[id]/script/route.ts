import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { SCRIPT_SYSTEM, scriptUserPrompt } from "@/lib/prompts";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const script = await prisma.script.findUnique({ where: { projectId: id } });
  if (!script) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(script);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const research = await prisma.research.findUnique({ where: { projectId: id } });
    const modelId = project.modelId ?? DEFAULT_MODEL_ID;

    await prisma.project.update({ where: { id }, data: { currentStep: "script", status: "generating" } });

    const claims: string[] = research ? JSON.parse(research.claims) : [];
    const stats: { stat: string; context: string }[] = research ? JSON.parse(research.statistics) : [];
    const rawJson = research?.rawJson ? JSON.parse(research.rawJson) : {};
    const topClaims = claims.slice(0, 5).join("; ");
    const statistics = stats.slice(0, 5).map((s) => s.stat).join("; ");
    const summary = research?.summary ?? project.title;
    const viralAngles = (rawJson.viralAngles ?? []).join("; ");
    const controversialClaims = (rawJson.controversialClaims ?? []).join("; ");
    const quotableLines = (rawJson.quotableLines ?? []).join(" | ");

    const { data: raw } = await callWithFallbackJSON<{
      title: string;
      hook: string;
      body: string;
      cta: string;
      fullScript: string;
      wordCount: number;
      qualityScore: number;
    }>(
      SCRIPT_SYSTEM,
      scriptUserPrompt(
        project.title,
        project.niche,
        project.audience,
        project.duration,
        project.style,
        project.tone,
        summary,
        topClaims,
        statistics,
        viralAngles,
        controversialClaims,
        quotableLines
      ),
      8192,
      modelId
    );

    const script = await prisma.script.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        title: raw.title ?? project.title,
        hook: raw.hook ?? "",
        body: raw.body ?? "",
        cta: raw.cta ?? "",
        fullScript: raw.fullScript ?? "",
        wordCount: raw.wordCount ?? 0,
        qualityScore: raw.qualityScore ?? 0,
      },
      update: {
        title: raw.title ?? project.title,
        hook: raw.hook ?? "",
        body: raw.body ?? "",
        cta: raw.cta ?? "",
        fullScript: raw.fullScript ?? "",
        wordCount: raw.wordCount ?? 0,
        qualityScore: raw.qualityScore ?? 0,
      },
    });

    await prisma.project.update({ where: { id }, data: { currentStep: "scenes", status: "completed" } });
    return NextResponse.json(script);
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
    const script = await prisma.script.update({ where: { projectId: id }, data: body });
    return NextResponse.json(script);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
