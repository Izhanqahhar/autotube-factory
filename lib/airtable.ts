/**
 * Airtable integration — uses pre-created base + tables.
 *
 * Required env vars:
 *   AIRTABLE_API_KEY        — personal access token (pat...)
 *   AIRTABLE_BASE_ID        — e.g. appse0mCSULJ5auaY
 *   AIRTABLE_RUNS_TABLE_ID  — main project runs table
 *
 * Optional (extra detail tables):
 *   AIRTABLE_STEPS_TABLE_ID   — per-pipeline-step log
 *   AIRTABLE_ASSETS_TABLE_ID  — generated assets (images, thumbnails, audio)
 *   AIRTABLE_PROMPTS_TABLE_ID — image prompts list
 */

import { prisma } from "@/lib/prisma";

const AT_API = "https://api.airtable.com/v0";

function atHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

async function atPost(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${AT_API}${path}`, {
    method: "POST",
    headers: atHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Airtable POST ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function atPatch(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${AT_API}${path}`, {
    method: "PATCH",
    headers: atHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Airtable PATCH ${path} → ${res.status}: ${txt.slice(0, 200)}`);
  }
  return res.json();
}

async function atGet(apiKey: string, path: string) {
  const res = await fetch(`${AT_API}${path}`, {
    headers: atHeaders(apiKey),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;
  return res.json();
}

/** Find an existing record in a table by a formula */
async function findRecord(
  apiKey: string,
  baseId: string,
  tableId: string,
  formula: string
): Promise<string | null> {
  try {
    const data = await atGet(
      apiKey,
      `/${baseId}/${tableId}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`
    );
    return data?.records?.[0]?.id ?? null;
  } catch {
    return null;
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function exportProjectToAirtable(projectId: string): Promise<void> {
  const apiKey    = process.env.AIRTABLE_API_KEY;
  const baseId    = process.env.AIRTABLE_BASE_ID;
  const runsTable = process.env.AIRTABLE_RUNS_TABLE_ID;

  if (!apiKey || !baseId || !runsTable) {
    throw new Error(
      "Airtable not configured — set AIRTABLE_API_KEY, AIRTABLE_BASE_ID, AIRTABLE_RUNS_TABLE_ID in .env.local"
    );
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const project = await (prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      research: { select: { summary: true, claims: true } },
      script: { select: { wordCount: true, qualityScore: true, title: true, hook: true } },
      _count: { select: { scenes: true, imagePrompts: true } },
    },
  }) as any);

  // Parse metadata for YouTube titles/tags if available
  let ytTitles = "";
  let ytTags = "";
  if (project.metadataJson) {
    try {
      const meta = JSON.parse(project.metadataJson);
      ytTitles = (meta.titles ?? []).slice(0, 3).join(" | ");
      ytTags   = (meta.tags ?? []).slice(0, 15).join(", ");
    } catch { /* ignore bad JSON */ }
  }

  const runFields: Record<string, unknown> = {
    "Project ID":         project.id,
    "Title":              project.title,
    "Niche":              project.niche,
    "Audience":           project.audience,
    "Duration (min)":     project.duration,
    "Style":              project.style,
    "Tone":               project.tone,
    "Status":             project.status,
    "Research Model":     project.researchModelId ?? project.modelId,
    "Script Model":       project.scriptModelId   ?? project.modelId,
    "Image Prompt Model": project.imagePromptModelId ?? project.modelId,
    "Script Word Count":  project.script?.wordCount ?? 0,
    "Quality Score":      project.script?.qualityScore ?? 0,
    "Hook":               project.script?.hook ?? "",
    "Research Summary":   project.research?.summary ?? "",
    "YouTube Titles":     ytTitles,
    "YouTube Tags":       ytTags,
    "Thumbnail URL":      project.thumbnailUrl ? `${appUrl}${project.thumbnailUrl}` : "",
    "Image Prompts":      project._count.imagePrompts,
    "Scenes":             project._count.scenes,
    "App URL":            `${appUrl}/project/${project.id}`,
    "Created At":         project.createdAt.toISOString(),
  };

  // Upsert — check if record exists by Project ID
  const existingId = await findRecord(apiKey, baseId, runsTable, `{Project ID}="${projectId}"`);
  if (existingId) {
    await atPatch(apiKey, `/${baseId}/${runsTable}/${existingId}`, { fields: runFields });
    console.log(`[Airtable] Updated run record ${existingId} for project ${projectId}`);
  } else {
    const created = await atPost(apiKey, `/${baseId}/${runsTable}`, {
      records: [{ fields: runFields }],
    });
    console.log(`[Airtable] Created run record ${created?.records?.[0]?.id} for project ${projectId}`);
  }

  // ── Assets table (thumbnail) ──────────────────────────────────────────────
  const assetsTable = process.env.AIRTABLE_ASSETS_TABLE_ID;
  if (assetsTable && project.thumbnailUrl) {
    try {
      const assetFields: Record<string, unknown> = {
        "Project ID":    project.id,
        "Project Title": project.title,
        "Asset Type":    "Thumbnail",
        "URL":           `${appUrl}${project.thumbnailUrl}`,
        "Created At":    project.createdAt.toISOString(),
      };
      const existingAsset = await findRecord(
        apiKey, baseId, assetsTable,
        `AND({Project ID}="${projectId}",{Asset Type}="Thumbnail")`
      );
      if (!existingAsset) {
        await atPost(apiKey, `/${baseId}/${assetsTable}`, { records: [{ fields: assetFields }] });
      }
    } catch (e) {
      console.warn("[Airtable] Assets table write failed (non-fatal):", e instanceof Error ? e.message : e);
    }
  }

  // ── Prompts table (image prompts list) ────────────────────────────────────
  const promptsTable = process.env.AIRTABLE_PROMPTS_TABLE_ID;
  if (promptsTable) {
    try {
      const prompts = await prisma.imagePrompt.findMany({
        where: { projectId },
        orderBy: { promptNumber: "asc" },
        take: 50,
      });
      const existingPrompt = await findRecord(
        apiKey, baseId, promptsTable, `{Project ID}="${projectId}"`
      );
      if (!existingPrompt && prompts.length > 0) {
        // Airtable allows max 10 records per POST
        for (let i = 0; i < prompts.length; i += 10) {
          const batch = prompts.slice(i, i + 10).map((p) => ({
            fields: {
              "Project ID":    projectId,
              "Project Title": project.title,
              "Prompt #":      p.promptNumber,
              "Title":         p.title,
              "Prompt":        p.shortPrompt,
              "Image Type":    p.imageType,
              "Time Start":    p.timeStart,
              "Time End":      p.timeEnd,
              "Status":        p.status,
              "Image URL":     p.generatedImageUrl ? `${appUrl}${p.generatedImageUrl}` : "",
            },
          }));
          await atPost(apiKey, `/${baseId}/${promptsTable}`, { records: batch });
        }
        console.log(`[Airtable] Created ${prompts.length} prompt records for project ${projectId}`);
      }
    } catch (e) {
      console.warn("[Airtable] Prompts table write failed (non-fatal):", e instanceof Error ? e.message : e);
    }
  }

  console.log(`[Airtable] Export complete for project ${projectId}`);
}
