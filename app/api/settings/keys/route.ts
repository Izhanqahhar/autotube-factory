import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Keys that are sensitive — mask when returning
const SECRET_KEYS = new Set([
  "GROQ_API_KEY",
  "GOOGLE_AI_KEY",
  "OPENROUTER_API_KEY",
  "HUGGINGFACE_API_KEY",
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_AI_KEY",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "UNSPLASH_ACCESS_KEY",
  "PEXELS_API_KEY",
  "PIXABAY_API_KEY",
]);

function maskValue(key: string, value: string): string {
  if (!SECRET_KEYS.has(key)) return value;
  if (value.length <= 8) return "••••••••";
  return value.slice(0, 4) + "••••••••" + value.slice(-4);
}

// GET /api/settings/keys — return all saved settings (masked)
export async function GET() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).appSettings.findMany();
    const result: Record<string, { masked: string; set: boolean }> = {};
    for (const row of rows) {
      result[row.key] = {
        masked: maskValue(row.key, row.value),
        set: row.value.length > 0,
      };
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/settings/keys — save one or more key/value pairs
// body: { GROQ_API_KEY: "gsk_...", GOOGLE_AI_KEY: "AI..." }
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json() as Record<string, string>;

    const saved: string[] = [];

    for (const [key, value] of Object.entries(body)) {
      if (typeof key !== "string" || typeof value !== "string") continue;
      if (!key.match(/^[A-Z0-9_]+$/)) continue; // only uppercase env var names

      // Persist to DB
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).appSettings.upsert({
        where: { key },
        create: { key, value },
        update: { value },
      });

      // Also inject into current process so this Node process can use it immediately
      process.env[key] = value;

      saved.push(key);
    }

    return NextResponse.json({ saved });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/settings/keys — remove a key
// body: { key: "GROQ_API_KEY" }
export async function DELETE(req: NextRequest) {
  try {
    const { key } = await req.json();
    if (!key) return NextResponse.json({ error: "key required" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any).appSettings.deleteMany({ where: { key } });
    delete process.env[key];

    return NextResponse.json({ deleted: key });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
