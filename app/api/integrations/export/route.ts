/**
 * POST /api/integrations/export?projectId=xxx[&target=airtable|notion|slack]
 *
 * If ?target= is provided, only that integration runs.
 * Otherwise all three run in sequence.
 * Every integration result is returned individually so the UI can show
 * per-integration success/error.
 */
import { NextRequest, NextResponse } from "next/server";
import { exportProjectToAirtable } from "@/lib/airtable";
import { exportProjectToNotion } from "@/lib/notion";
import { notifySlack } from "@/lib/slack";

export async function POST(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  let projectId = searchParams.get("projectId");
  const target = searchParams.get("target"); // "airtable" | "notion" | "slack" | null

  if (!projectId) {
    const body = await req.json().catch(() => ({}));
    projectId = body.projectId;
  }
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const results: Record<string, { ok: boolean; error?: string; notionUrl?: string }> = {};

  async function runAirtable() {
    try {
      await exportProjectToAirtable(projectId!);
      results.airtable = { ok: true };
    } catch (e) {
      results.airtable = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function runNotion() {
    try {
      const url = await exportProjectToNotion(projectId!);
      results.notion = { ok: true, notionUrl: typeof url === "string" ? url : undefined };
    } catch (e) {
      results.notion = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  async function runSlack() {
    try {
      await notifySlack(projectId!);
      results.slack = { ok: true };
    } catch (e) {
      results.slack = { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  }

  if (!target || target === "airtable") await runAirtable();
  if (!target || target === "notion")   await runNotion();
  if (!target || target === "slack")    await runSlack();

  return NextResponse.json({ projectId, results });
}
