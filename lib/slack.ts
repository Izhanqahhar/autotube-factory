/**
 * Slack notification integration.
 *
 * Required env vars:
 *   SLACK_BOT_TOKEN   — xoxb-... bot token (NOT xapp-)
 *   SLACK_CHANNEL_ID  — channel ID to post to (e.g. C0B3MDH3KNC)
 *
 * Sends a rich Block Kit message when a project completes.
 * Throws on any error so callers can surface it.
 */

import { prisma } from "@/lib/prisma";

const SLACK_API = "https://slack.com/api";

async function slackPost(token: string, method: string, body: unknown) {
  if (token.startsWith("xapp-")) {
    throw new Error(
      "Slack token is xapp- (Socket Mode) — cannot post messages. " +
      "Go to api.slack.com/apps → OAuth & Permissions → copy the Bot User OAuth Token (xoxb-...) and set SLACK_BOT_TOKEN in .env.local"
    );
  }
  const res = await fetch(`${SLACK_API}/${method}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(10000),
  });
  const data = await res.json();
  if (!data.ok) {
    throw new Error(`Slack ${method} error: ${data.error ?? JSON.stringify(data)}`);
  }
  return data;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function notifySlack(projectId: string): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN;
  if (!token) {
    throw new Error("Slack not configured — set SLACK_BOT_TOKEN (xoxb-...) in .env.local");
  }

  const channel = process.env.SLACK_CHANNEL_ID;
  if (!channel) {
    throw new Error("Slack not configured — set SLACK_CHANNEL_ID in .env.local");
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  const project = await prisma.project.findUniqueOrThrow({
    where: { id: projectId },
    include: {
      research: { select: { summary: true } },
      script: { select: { wordCount: true, qualityScore: true, hook: true } },
      _count: { select: { scenes: true, imagePrompts: true } },
    },
  });

  const statusEmoji = project.status === "completed" ? "✅" : project.status === "failed" ? "❌" : "⏳";
  const projectUrl = `${appUrl}/project/${project.id}`;

  // Retrieve Notion page URL if created previously
  const notionSetting = await prisma.appSettings
    .findUnique({ where: { key: `notion_page_${projectId}` } })
    .catch(() => null);
  const notionUrl = notionSetting?.value;

  const blocks: unknown[] = [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: `${statusEmoji} AutoTube: ${project.title}`,
      },
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: `*Niche:*\n${project.niche}` },
        { type: "mrkdwn", text: `*Audience:*\n${project.audience}` },
        { type: "mrkdwn", text: `*Duration:*\n${project.duration} min` },
        { type: "mrkdwn", text: `*Style / Tone:*\n${project.style} / ${project.tone}` },
        { type: "mrkdwn", text: `*Quality Score:*\n${project.script?.qualityScore ?? "N/A"}/100` },
        { type: "mrkdwn", text: `*Word Count:*\n${project.script?.wordCount ?? 0} words` },
        { type: "mrkdwn", text: `*Scenes:*\n${project._count.scenes}` },
        { type: "mrkdwn", text: `*Image Prompts:*\n${project._count.imagePrompts}` },
      ],
    },
  ];

  if (project.research?.summary) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*📊 Research Summary:*\n${project.research.summary.slice(0, 300)}${project.research.summary.length > 300 ? "…" : ""}`,
      },
    });
  }

  if (project.script?.hook) {
    blocks.push({
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*🎣 Hook:*\n_${project.script.hook.slice(0, 200)}${project.script.hook.length > 200 ? "…" : ""}_`,
      },
    });
  }

  blocks.push({
    type: "section",
    text: {
      type: "mrkdwn",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      text: `*🤖 Models:*\nResearch: \`${(project as any).researchModelId ?? project.modelId}\`  Script: \`${(project as any).scriptModelId ?? project.modelId}\``,
    },
  });

  blocks.push({ type: "divider" });

  const actions: unknown[] = [
    {
      type: "button",
      text: { type: "plain_text", text: "🔗 View in App" },
      url: projectUrl,
      style: "primary",
    },
  ];
  if (notionUrl) {
    actions.push({
      type: "button",
      text: { type: "plain_text", text: "📓 Open in Notion" },
      url: notionUrl,
    });
  }
  blocks.push({ type: "actions", elements: actions });

  if (project.thumbnailUrl) {
    blocks.push({
      type: "image",
      image_url: `${appUrl}${project.thumbnailUrl}`,
      alt_text: `Thumbnail for ${project.title}`,
    });
  }

  await slackPost(token, "chat.postMessage", {
    channel,
    text: `${statusEmoji} AutoTube project completed: ${project.title}`,
    blocks,
    unfurl_links: false,
  });

  console.log(`[Slack] Notification sent to channel ${channel} for project ${projectId}`);
}
