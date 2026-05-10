import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getProviderFromModelId } from "@/lib/llm-router";
import { callWithFallbackJSON } from "@/lib/ai-fallback";
import { DEFAULT_MODEL_ID } from "@/lib/models";
import { exportProjectToAirtable } from "@/lib/airtable";
import { exportProjectToNotion } from "@/lib/notion";
import { notifySlack } from "@/lib/slack";
import {
  RESEARCH_SYSTEM,
  researchUserPrompt,
  SCRIPT_SYSTEM,
  scriptUserPrompt,
  SCENES_SYSTEM,
  scenesUserPrompt,
  IMAGE_PROMPTS_SYSTEM,
  imagePromptsUserPrompt,
  VOICEOVER_SYSTEM,
  voiceoverUserPrompt,
  getPromptCount,
} from "@/lib/prompts";

// GET /api/projects — list all
export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        research: { select: { id: true, summary: true } },
        script: { select: { id: true, wordCount: true, qualityScore: true } },
        _count: { select: { scenes: true, imagePrompts: true } },
      },
    });
    return NextResponse.json(projects);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST /api/projects — create + kick off pipeline async
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      title, niche, audience, duration, style, tone, notes,
      modelId, sourceTopicId,
      researchModelId, scriptModelId, imagePromptModelId,
      exportToAirtable, exportToNotion,
    } = body;

    if (!title || !niche || !audience || !duration || !style || !tone) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const resolvedModelId = modelId ?? DEFAULT_MODEL_ID;

    const project = await prisma.project.create({
      data: {
        title,
        niche,
        audience,
        duration: Number(duration),
        style,
        tone,
        notes: notes ?? null,
        modelId: resolvedModelId,
        modelProvider: getProviderFromModelId(resolvedModelId),
        sourceTopicId: sourceTopicId ?? null,
        researchModelId: researchModelId ?? null,
        scriptModelId: scriptModelId ?? null,
        imagePromptModelId: imagePromptModelId ?? null,
        exportToAirtable: exportToAirtable === true,
        exportToNotion: exportToNotion === true,
        status: "generating",
        currentStep: "research",
      },
    });

    // If created from a topic suggestion, mark it as used
    if (sourceTopicId) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).topicSuggestion.update({
        where: { id: sourceTopicId },
        data: { status: "used" },
      }).catch(() => {});
    }

    // Fire-and-forget pipeline
    runPipeline(project.id).catch(console.error);

    return NextResponse.json(project, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// ─── Pipeline ────────────────────────────────────────────────────────────────

async function updateStep(id: string, step: string) {
  await prisma.project.update({ where: { id }, data: { currentStep: step } });
}

async function logStep(
  projectId: string,
  step: string,
  modelId: string,
  provider: string,
  latencyMs: number,
  success = true,
  error?: string
) {
  try {
    await prisma.generationLog.create({
      data: { projectId, step, modelId, provider, latencyMs, success, error: error ?? null },
    });
  } catch { /* non-fatal — never block the pipeline */ }
}

async function runPipeline(projectId: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } }) as any;
  const modelId = project.modelId ?? DEFAULT_MODEL_ID;
  // Per-step model overrides (fall back to main modelId)
  const researchModel      = project.researchModelId    ?? modelId;
  const scriptModel        = project.scriptModelId      ?? modelId;
  const imagePromptModel   = project.imagePromptModelId ?? modelId;

  try {
    // 1. Research
    await updateStep(projectId, "research");
    const { data: rawResearch, modelUsed: researchModelUsed, provider: researchProvider, latencyMs: researchLatency } = await callWithFallbackJSON<{
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
    }>(
      RESEARCH_SYSTEM,
      researchUserPrompt(project.title, project.niche, project.audience),
      4096,
      researchModel
    );
    await logStep(projectId, "research", researchModelUsed, researchProvider, researchLatency);

    await prisma.research.upsert({
      where: { projectId },
      create: {
        projectId,
        claims: JSON.stringify(rawResearch.claims ?? []),
        sources: JSON.stringify(rawResearch.sources ?? []),
        summary: rawResearch.summary ?? "",
        hooks: JSON.stringify(rawResearch.emotionalHooks ?? []),
        statistics: JSON.stringify(rawResearch.statistics ?? []),
        rawJson: JSON.stringify(rawResearch),
      },
      update: {
        claims: JSON.stringify(rawResearch.claims ?? []),
        sources: JSON.stringify(rawResearch.sources ?? []),
        summary: rawResearch.summary ?? "",
        hooks: JSON.stringify(rawResearch.emotionalHooks ?? []),
        statistics: JSON.stringify(rawResearch.statistics ?? []),
        rawJson: JSON.stringify(rawResearch),
      },
    });

    // 2. Script
    await updateStep(projectId, "script");
    const topClaims = (rawResearch.claims ?? []).slice(0, 5).join("; ");
    const statistics = (rawResearch.statistics ?? [])
      .slice(0, 5)
      .map((s) => s.stat)
      .join("; ");

    const { data: rawScript, modelUsed: scriptModelUsed, provider: scriptProvider, latencyMs: scriptLatency } = await callWithFallbackJSON<{
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
        rawResearch.summary ?? "",
        topClaims,
        statistics,
        (rawResearch.viralAngles ?? []).join("; "),
        (rawResearch.controversialClaims ?? []).join("; "),
        (rawResearch.quotableLines ?? []).join(" | ")
      ),
      8192,
      scriptModel
    );
    await logStep(projectId, "script", scriptModelUsed, scriptProvider, scriptLatency);

    await prisma.script.upsert({
      where: { projectId },
      create: {
        projectId,
        title: rawScript.title ?? project.title,
        hook: rawScript.hook ?? "",
        body: rawScript.body ?? "",
        cta: rawScript.cta ?? "",
        fullScript: rawScript.fullScript ?? "",
        wordCount: rawScript.wordCount ?? 0,
        qualityScore: rawScript.qualityScore ?? 0,
      },
      update: {
        title: rawScript.title ?? project.title,
        hook: rawScript.hook ?? "",
        body: rawScript.body ?? "",
        cta: rawScript.cta ?? "",
        fullScript: rawScript.fullScript ?? "",
        wordCount: rawScript.wordCount ?? 0,
        qualityScore: rawScript.qualityScore ?? 0,
      },
    });

    // 3. Scenes
    await updateStep(projectId, "scenes");
    const { data: rawScenes, modelUsed: scenesModelUsed, provider: scenesProvider, latencyMs: scenesLatency } = await callWithFallbackJSON<
      {
        sceneNumber: number;
        title: string;
        content: string;
        duration: number;
        beatType: string;
        timeStart: number;
        timeEnd: number;
      }[]
    >(SCENES_SYSTEM, scenesUserPrompt(rawScript.fullScript, project.duration), 4096, modelId);
    await logStep(projectId, "scenes", scenesModelUsed, scenesProvider, scenesLatency);

    await prisma.scene.deleteMany({ where: { projectId } });
    await prisma.scene.createMany({
      data: rawScenes.map((s) => ({
        projectId,
        sceneNumber: s.sceneNumber,
        title: s.title,
        content: s.content,
        duration: s.duration,
        beatType: s.beatType,
        timeStart: s.timeStart,
        timeEnd: s.timeEnd,
      })),
    });

    // 4. Image Prompts
    await updateStep(projectId, "image-prompts");
    const promptCount = getPromptCount(project.duration);
    const scriptSections = rawScenes
      .map((s) => `[${s.sceneNumber}] ${s.title}: ${s.content.slice(0, 80)}`)
      .join("\n");

    const { data: rawPrompts, modelUsed: promptsModelUsed, provider: promptsProvider, latencyMs: promptsLatency } = await callWithFallbackJSON<
      {
        promptNumber: number;
        timeStart: number;
        timeEnd: number;
        minuteBucket: number;
        beatIndex: number;
        title: string;
        shortPrompt: string;
        altPrompt?: string;
        imageType: string;
      }[]
    >(
      IMAGE_PROMPTS_SYSTEM,
      imagePromptsUserPrompt(
        project.title,
        project.duration,
        project.style,
        project.tone,
        project.niche,
        rawResearch.summary ?? "",
        scriptSections
      ),
      8192,
      imagePromptModel
    );
    await logStep(projectId, "image-prompts", promptsModelUsed, promptsProvider, promptsLatency);

    await prisma.imagePrompt.deleteMany({ where: { projectId } });
    await prisma.imagePrompt.createMany({
      data: rawPrompts.map((p) => ({
        projectId,
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

    // 5. Voiceover
    await updateStep(projectId, "voiceover");
    const { data: rawVoiceover, modelUsed: voiceoverModelUsed, provider: voiceoverProvider, latencyMs: voiceoverLatency } = await callWithFallbackJSON<{
      fullText: string;
      segments: { text: string; timeStart: number; timeEnd: number }[];
      wordCount: number;
      estimatedDuration: number;
    }>(
      VOICEOVER_SYSTEM,
      voiceoverUserPrompt(rawScript.fullScript, project.duration, project.tone),
      4096,
      modelId
    );
    await logStep(projectId, "voiceover", voiceoverModelUsed, voiceoverProvider, voiceoverLatency);

    await prisma.voiceover.upsert({
      where: { projectId },
      create: {
        projectId,
        fullText: rawVoiceover.fullText ?? "",
        segments: JSON.stringify(rawVoiceover.segments ?? []),
        wordCount: rawVoiceover.wordCount ?? 0,
        estimatedDuration: rawVoiceover.estimatedDuration ?? 0,
      },
      update: {
        fullText: rawVoiceover.fullText ?? "",
        segments: JSON.stringify(rawVoiceover.segments ?? []),
        wordCount: rawVoiceover.wordCount ?? 0,
        estimatedDuration: rawVoiceover.estimatedDuration ?? 0,
      },
    });

    // Done — also save which model was actually used for the main step
    await prisma.project.update({
      where: { id: projectId },
      data: {
        status: "completed",
        currentStep: "done",
        errorMessage: null,
        modelUsed: scriptModelUsed,  // record the script model as "main" model used
      },
    });

    // Integrations — all non-blocking, errors swallowed inside each module
    // Airtable: only if user opted in
    if (project.exportToAirtable) {
      exportProjectToAirtable(projectId).catch(() => {});
    }
    // Notion + Slack chain: Notion only if opted in, Slack always fires
    if (project.exportToNotion) {
      exportProjectToNotion(projectId)
        .then(() => notifySlack(projectId))
        .catch(() => notifySlack(projectId).catch(() => {}));
    } else {
      // Slack always notifies regardless of Notion toggle
      notifySlack(projectId).catch(() => {});
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "failed", currentStep: "failed", errorMessage: msg },
    });
  }
}
