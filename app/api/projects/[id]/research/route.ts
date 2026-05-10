import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { RESEARCH_SYSTEM, researchUserPrompt } from "@/lib/prompts";
import { DEFAULT_MODEL_ID } from "@/lib/models";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const research = await prisma.research.findUnique({ where: { projectId: id } });
  if (!research) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(research);
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUniqueOrThrow({ where: { id } });
    const modelId = project.modelId ?? DEFAULT_MODEL_ID;

    await prisma.project.update({ where: { id }, data: { currentStep: "research", status: "generating" } });

    const { data: raw } = await callWithFallbackJSON<{
      claims: string[];
      sources: { type: string; description: string }[];
      summary: string;
      emotionalHooks: string[];
      statistics: { stat: string; context: string }[];
      commonMisconceptions: string[];
      targetPainPoints: string[];
      viralAngles: string[];
      controversialClaims: string[];
      quotableLines: string[];
      relatedTrends: string[];
    }>(RESEARCH_SYSTEM, researchUserPrompt(project.title, project.niche, project.audience), 4096, modelId);

    const research = await prisma.research.upsert({
      where: { projectId: id },
      create: {
        projectId: id,
        claims: JSON.stringify(raw.claims ?? []),
        sources: JSON.stringify(raw.sources ?? []),
        summary: raw.summary ?? "",
        hooks: JSON.stringify(raw.emotionalHooks ?? []),
        statistics: JSON.stringify(raw.statistics ?? []),
        rawJson: JSON.stringify(raw),
      },
      update: {
        claims: JSON.stringify(raw.claims ?? []),
        sources: JSON.stringify(raw.sources ?? []),
        summary: raw.summary ?? "",
        hooks: JSON.stringify(raw.emotionalHooks ?? []),
        statistics: JSON.stringify(raw.statistics ?? []),
        rawJson: JSON.stringify(raw),
      },
    });

    await prisma.project.update({ where: { id }, data: { currentStep: "script", status: "completed" } });
    return NextResponse.json(research);
  } catch (e) {
    await prisma.project.update({
      where: { id: (await params).id },
      data: { status: "failed", errorMessage: String(e) },
    }).catch(() => {});
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
