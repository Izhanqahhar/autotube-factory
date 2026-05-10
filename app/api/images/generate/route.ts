import { NextRequest, NextResponse } from "next/server";
import { getImageForPrompt, ImageSource } from "@/lib/image-router";
import { prisma } from "@/lib/prisma";

// POST /api/images/generate
// body: { prompt, imageType?, source?, width?, height?, promptId? }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { prompt, imageType = "scene", source = "auto", width, height, promptId } = body;

    if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

    const result = await getImageForPrompt(prompt, imageType, source as ImageSource, { width, height });

    // Update DB record if promptId was provided
    if (promptId && result.localPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).imagePrompt.update({
          where: { id: promptId },
          data: {
            generatedImagePath: result.localPath,
            generatedImageUrl: result.url,
            imageSource: result.source ?? "pollinations",
            imageGeneratedAt: new Date(),
            status: "generated",
          },
        });
      } catch (dbErr) {
        console.error("[images/generate] DB update failed:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/images/generate?prompt=...&source=pollinations&promptId=...
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const prompt = searchParams.get("prompt");
  const source = (searchParams.get("source") ?? "auto") as ImageSource;
  const imageType = searchParams.get("imageType") ?? "scene";
  const promptId = searchParams.get("promptId");

  if (!prompt) return NextResponse.json({ error: "prompt required" }, { status: 400 });

  try {
    const result = await getImageForPrompt(prompt, imageType, source);

    if (promptId && result.localPath) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (prisma as any).imagePrompt.update({
          where: { id: promptId },
          data: {
            generatedImagePath: result.localPath,
            generatedImageUrl: result.url,
            imageSource: result.source ?? "pollinations",
            imageGeneratedAt: new Date(),
            status: "generated",
          },
        });
      } catch (dbErr) {
        console.error("[images/generate] DB update failed:", dbErr);
      }
    }

    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
