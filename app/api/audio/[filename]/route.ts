/**
 * GET /api/audio/[filename]
 *
 * Streams audio files from /app/public/generated/audio/
 * Needed because Next.js standalone mode doesn't serve
 * volume-mounted public/ files as static assets.
 */

import { NextRequest, NextResponse } from "next/server";
import { join } from "path";
import { existsSync, readFileSync, statSync } from "fs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;

  // Security: only allow mp3/wav files, no path traversal
  if (!filename || !/^[\w\-]+\.(mp3|wav)$/i.test(filename)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const filePath = join(process.cwd(), "public", "generated", "audio", filename);

  if (!existsSync(filePath)) {
    return new NextResponse("Audio file not found", { status: 404 });
  }

  const buf = readFileSync(filePath);
  const stat = statSync(filePath);
  const ext = filename.split(".").pop()?.toLowerCase();
  const contentType = ext === "wav" ? "audio/wav" : "audio/mpeg";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(stat.size),
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `inline; filename="${filename}"`,
    },
  });
}
