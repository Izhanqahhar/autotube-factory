import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createRequire } from "module";
const require = createRequire(import.meta.url);
// eslint-disable-next-line @typescript-eslint/no-require-imports
const archiver = require("archiver") as (format: string, options?: object) => import("archiver").Archiver;
import * as fs from "fs";
import * as path from "path";
import { Readable } from "stream";

// GET /api/projects/[id]/download — stream a ZIP of all project assets
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await prisma.project.findUniqueOrThrow({
      where: { id },
      include: {
        research: true,
        script: true,
        scenes: { orderBy: { sceneNumber: "asc" } },
        imagePrompts: { orderBy: { promptNumber: "asc" } },
        voiceover: true,
      },
    });

    const publicDir = path.join(process.cwd(), "public");

    // Create archive
    const archive = archiver("zip", { zlib: { level: 6 } });

    // ── Text / JSON assets ─────────────────────────────────────────────────

    // Full project JSON
    archive.append(JSON.stringify(project, null, 2), { name: "project-full.json" });

    // Script
    if (project.script?.fullScript) {
      archive.append(project.script.fullScript, { name: "script/script.txt" });
      archive.append(
        JSON.stringify({
          title: project.script.title,
          hook: project.script.hook,
          body: project.script.body,
          cta: project.script.cta,
          wordCount: project.script.wordCount,
          qualityScore: project.script.qualityScore,
        }, null, 2),
        { name: "script/script.json" }
      );
    }

    // Research
    if (project.research) {
      archive.append(
        JSON.stringify({
          summary: project.research.summary,
          claims: JSON.parse(project.research.claims),
          statistics: JSON.parse(project.research.statistics),
          sources: JSON.parse(project.research.sources),
          hooks: JSON.parse(project.research.hooks),
        }, null, 2),
        { name: "research/research.json" }
      );
      archive.append(project.research.summary, { name: "research/summary.txt" });
    }

    // Scenes
    if (project.scenes?.length) {
      const scenesText = project.scenes.map((s) =>
        `SCENE ${s.sceneNumber}: ${s.title} [${s.timeStart}s - ${s.timeEnd}s]\n${s.content}`
      ).join("\n\n---\n\n");
      archive.append(scenesText, { name: "scenes/scenes.txt" });
      archive.append(JSON.stringify(project.scenes, null, 2), { name: "scenes/scenes.json" });
    }

    // Image Prompts
    if (project.imagePrompts?.length) {
      const promptsTxt = project.imagePrompts.map((p) =>
        `#${p.promptNumber} [${p.imageType}] ${p.title}\nPrompt: ${p.shortPrompt}${p.altPrompt ? `\nAlt: ${p.altPrompt}` : ""}\nTime: ${p.timeStart}s - ${p.timeEnd}s`
      ).join("\n\n---\n\n");
      archive.append(promptsTxt, { name: "images/image-prompts.txt" });
      archive.append(JSON.stringify(project.imagePrompts, null, 2), { name: "images/image-prompts.json" });
    }

    // Voiceover text
    if (project.voiceover?.fullText) {
      archive.append(project.voiceover.fullText, { name: "voiceover/voiceover.txt" });
      if (project.voiceover.segments) {
        archive.append(project.voiceover.segments, { name: "voiceover/segments.json" });
      }
    }

    // YouTube Metadata
    if (project.metadataJson) {
      archive.append(project.metadataJson as string, { name: "youtube/metadata.json" });
      try {
        const meta = JSON.parse(project.metadataJson as string);
        let ytTxt = `YOUTUBE METADATA\n${"=".repeat(60)}\n\n`;
        ytTxt += `RECOMMENDED TITLES:\n`;
        (meta.titles ?? []).forEach((t: string, i: number) => { ytTxt += `${i + 1}. ${t}\n`; });
        ytTxt += `\nDESCRIPTION:\n${meta.description ?? ""}\n`;
        ytTxt += `\nTAGS:\n${(meta.tags ?? []).join(", ")}\n`;
        ytTxt += `\nHASHTAGS:\n${(meta.hashtags ?? []).join(" ")}\n`;
        ytTxt += `\nPINNED COMMENT:\n${meta.pinnedComment ?? ""}\n`;
        if (meta.chapterMarkers?.length) {
          ytTxt += `\nCHAPTER MARKERS:\n${meta.chapterMarkers.join("\n")}\n`;
        }
        archive.append(ytTxt, { name: "youtube/youtube-metadata.txt" });
      } catch { /* ignore parse error */ }
    }

    // ── File assets (if they exist on disk) ───────────────────────────────

    // Thumbnail
    if (project.thumbnailUrl) {
      const thumbPath = path.join(publicDir, project.thumbnailUrl.replace(/^\//, ""));
      if (fs.existsSync(thumbPath)) {
        archive.file(thumbPath, { name: `thumbnails/${path.basename(thumbPath)}` });
      }
    }

    // SRT subtitles
    if (project.subtitleSrtPath) {
      const srtPath = path.join(publicDir, (project.subtitleSrtPath as string).replace(/^\//, ""));
      if (fs.existsSync(srtPath)) {
        archive.file(srtPath, { name: `subtitles/${path.basename(srtPath)}` });
      }
    }

    // VTT subtitles
    if (project.subtitleVttPath) {
      const vttPath = path.join(publicDir, (project.subtitleVttPath as string).replace(/^\//, ""));
      if (fs.existsSync(vttPath)) {
        archive.file(vttPath, { name: `subtitles/${path.basename(vttPath)}` });
      }
    }

    // Generated images
    if (project.imagePrompts) {
      for (const ip of project.imagePrompts) {
        const imgUrl = (ip as Record<string, unknown>).generatedImagePath as string | undefined;
        if (imgUrl) {
          const imgPath = path.join(publicDir, imgUrl.replace(/^\//, ""));
          if (fs.existsSync(imgPath)) {
            archive.file(imgPath, { name: `images/${path.basename(imgPath)}` });
          }
        }
      }
    }

    // ── Stream the archive ────────────────────────────────────────────────
    await archive.finalize();

    // Convert Node stream to Web ReadableStream
    const nodeReadable = archive as unknown as NodeJS.ReadableStream;
    const webReadable = Readable.toWeb(nodeReadable as import("stream").Readable) as ReadableStream;

    const filename = `autotube-project-${id.slice(0, 8)}.zip`;
    return new NextResponse(webReadable, {
      status: 200,
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
