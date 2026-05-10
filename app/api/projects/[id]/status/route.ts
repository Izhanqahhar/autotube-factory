import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const STEP_PROGRESS: Record<string, number> = {
  idle: 0,
  research: 15,
  script: 35,
  scenes: 55,
  "image-prompts": 75,
  voiceover: 90,
  done: 100,
  failed: 0,
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({
      where: { id },
      select: { status: true, currentStep: true, errorMessage: true },
    });
    if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      status: project.status,
      currentStep: project.currentStep,
      progress: STEP_PROGRESS[project.currentStep] ?? 0,
      errorMessage: project.errorMessage,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
