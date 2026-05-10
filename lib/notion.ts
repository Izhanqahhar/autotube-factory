/**
 * Notion integration — creates a structured page for each completed project.
 *
 * Required env vars:
 *   NOTION_API_KEY         — integration token (ntn_...)
 *   NOTION_PARENT_PAGE_ID  — (optional) parent page ID to create under
 *                            If blank, creates at integration workspace root.
 *
 * The page contains:
 *   - Title + metadata callout
 *   - Research summary
 *   - Script hook
 *   - YouTube titles & tags
 *   - Image prompt list
 *   - Direct app link
 */

import { prisma } from "@/lib/prisma";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";

function notionHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

async function notionPost(apiKey: string, path: string, body: unknown) {
  const res = await fetch(`${NOTION_API}${path}`, {
    method: "POST",
    headers: notionHeaders(apiKey),
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Notion POST ${path} → ${res.status}: ${txt.slice(0, 300)}`);
  }
  return res.json();
}

// ── Block builders ────────────────────────────────────────────────────────────

function heading2(text: string) {
  return {
    object: "block",
    type: "heading_2",
    heading_2: { rich_text: [{ type: "text", text: { content: text } }] },
  };
}

function paragraph(text: string, bold = false) {
  return {
    object: "block",
    type: "paragraph",
    paragraph: {
      rich_text: [{ type: "text", text: { content: text }, annotations: { bold } }],
    },
  };
}

function bulletItem(text: string) {
  return {
    object: "block",
    type: "bulleted_list_item",
    bulleted_list_item: {
      rich_text: [{ type: "text", text: { content: text } }],
    },
  };
}

function callout(text: string, emoji: string) {
  return {
    object: "block",
    type: "callout",
    callout: {
      rich_text: [{ type: "text", text: { content: text } }],
      icon: { type: "emoji", emoji },
    },
  };
}

function divider() {
  return { object: "block", type: "divider", divider: {} };
}

function tableOfContents() {
  return { object: "block", type: "table_of_contents", table_of_contents: {} };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function exportProjectToNotion(projectId: string): Promise<string | undefined> {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    throw new Error("Notion not configured — set NOTION_API_KEY in .env.local");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: {
        research: { select: { summary: true, claims: true } },
        script: {
          select: {
            title: true, hook: true, body: true, cta: true,
            fullScript: true, wordCount: true, qualityScore: true,
          },
        },
        imagePrompts: {
          orderBy: { promptNumber: "asc" },
          take: 40,
        },
        _count: { select: { scenes: true, imagePrompts: true } },
      },
    }) as any;

    // Parse metadata JSON
    let ytTitles: string[] = [];
    let ytDescription = "";
    let ytTags: string[] = [];
    let ytHashtags: string[] = [];
    if (project.metadataJson) {
      try {
        const meta = JSON.parse(project.metadataJson);
        ytTitles      = meta.titles ?? [];
        ytDescription = meta.description ?? "";
        ytTags        = meta.tags ?? [];
        ytHashtags    = meta.hashtags ?? [];
      } catch {}
    }

    // Parse research claims
    let claims: string[] = [];
    if (project.research?.claims) {
      try { claims = JSON.parse(project.research.claims); } catch {}
    }

    // Build page title
    const pageTitle = `📹 ${project.title}`;

    // Build blocks
    const blocks: unknown[] = [
      tableOfContents(),
      divider(),

      // ── Metadata callout ──────────────────────────────────────────────────
      callout(
        `Niche: ${project.niche}  |  Audience: ${project.audience}  |  Duration: ${project.duration}min  |  Style: ${project.style}  |  Tone: ${project.tone}\nStatus: ${project.status}  |  Quality Score: ${project.script?.qualityScore ?? "N/A"}/100  |  Word Count: ${project.script?.wordCount ?? 0}`,
        "ℹ️"
      ),
      callout(`App: ${appUrl}/project/${project.id}`, "🔗"),
      divider(),

      // ── Research ──────────────────────────────────────────────────────────
      heading2("🔬 Research Summary"),
      paragraph(project.research?.summary ?? "No research available."),
    ];

    if (claims.length > 0) {
      blocks.push(heading2("📌 Key Claims"));
      claims.slice(0, 8).forEach((c) => blocks.push(bulletItem(c)));
    }

    blocks.push(divider());

    // ── Script ───────────────────────────────────────────────────────────────
    blocks.push(heading2("✍️ Script"));
    if (project.script?.hook) {
      blocks.push(paragraph("🎣 Hook:", true));
      blocks.push(paragraph(project.script.hook));
    }
    if (project.script?.body) {
      blocks.push(paragraph("📝 Body (first 1500 chars):", true));
      // Notion blocks max 2000 chars — split if needed
      const body = project.script.body.slice(0, 1500);
      blocks.push(paragraph(body));
    }
    if (project.script?.cta) {
      blocks.push(paragraph("📣 CTA:", true));
      blocks.push(paragraph(project.script.cta));
    }
    blocks.push(divider());

    // ── YouTube Metadata ─────────────────────────────────────────────────────
    if (ytTitles.length > 0) {
      blocks.push(heading2("🎬 YouTube Titles"));
      ytTitles.forEach((t) => blocks.push(bulletItem(t)));
    }
    if (ytDescription) {
      blocks.push(heading2("📄 YouTube Description"));
      // Split into ~1800 char chunks
      for (let i = 0; i < ytDescription.length; i += 1800) {
        blocks.push(paragraph(ytDescription.slice(i, i + 1800)));
      }
    }
    if (ytTags.length > 0) {
      blocks.push(heading2("🏷️ YouTube Tags"));
      blocks.push(paragraph(ytTags.join(", ")));
    }
    if (ytHashtags.length > 0) {
      blocks.push(paragraph("Hashtags: " + ytHashtags.join(" ")));
    }
    blocks.push(divider());

    // ── Image Prompts ─────────────────────────────────────────────────────────
    if (project.imagePrompts.length > 0) {
      blocks.push(heading2(`🎨 Image Prompts (${project._count.imagePrompts} total)`));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      project.imagePrompts.slice(0, 20).forEach((p: any) => {
        blocks.push(bulletItem(`[${p.promptNumber}] ${p.title}: ${p.shortPrompt}`));
      });
      if (project._count.imagePrompts > 20) {
        blocks.push(paragraph(`… and ${project._count.imagePrompts - 20} more — view all in app`));
      }
    }

    // ── Models used ───────────────────────────────────────────────────────────
    blocks.push(divider());
    blocks.push(heading2("🤖 Models Used"));
    blocks.push(bulletItem(`Research: ${project.researchModelId ?? project.modelId}`));
    blocks.push(bulletItem(`Script: ${project.scriptModelId ?? project.modelId}`));
    blocks.push(bulletItem(`Image Prompts: ${project.imagePromptModelId ?? project.modelId}`));

    // Notion API allows max 100 blocks per request — send in batches
    const BATCH = 90;

    // Try parent page first; fall back to workspace root if not shared
    const key = apiKey as string; // already checked above
    async function createPage(useWorkspaceRoot = false) {
      const parent = (!useWorkspaceRoot && process.env.NOTION_PARENT_PAGE_ID)
        ? { type: "page_id", page_id: process.env.NOTION_PARENT_PAGE_ID }
        : { type: "workspace", workspace: true };
      return notionPost(key, "/pages", {
        parent,
        icon: { type: "emoji", emoji: "📹" },
        properties: {
          title: { title: [{ type: "text", text: { content: pageTitle } }] },
        },
        children: blocks.slice(0, BATCH),
      });
    }

    let created: { id: string; url?: string };
    try {
      created = await createPage(false);
    } catch (firstErr) {
      const msg = firstErr instanceof Error ? firstErr.message : String(firstErr);
      if (msg.includes("404") || msg.includes("object_not_found")) {
        // Integration not shared with parent page — fall back to workspace root
        console.warn("[Notion] Parent page not found or not shared — retrying at workspace root");
        created = await createPage(true);
      } else {
        throw firstErr;
      }
    }

    const pageId = created.id as string;
    console.log(`[Notion] Created page ${pageId} for project ${projectId}`);

    // Append remaining blocks in batches of 100
    for (let i = BATCH; i < blocks.length; i += BATCH) {
      const batch = blocks.slice(i, i + BATCH);
      await notionPost(key, `/blocks/${pageId}/children`, { children: batch });
    }

    // Save Notion page URL to project
    const notionUrl = created.url ?? `https://notion.so/${pageId.replace(/-/g, "")}`;
    await prisma.appSettings.upsert({
      where: { key: `notion_page_${projectId}` },
      create: { key: `notion_page_${projectId}`, value: notionUrl },
      update: { value: notionUrl },
    });

    console.log(`[Notion] Page URL: ${notionUrl}`);
    return notionUrl;
  } catch (err) {
    console.error("[Notion] Export failed:", err instanceof Error ? err.message : String(err));
    throw err; // re-throw so caller can surface the error
  }
}
