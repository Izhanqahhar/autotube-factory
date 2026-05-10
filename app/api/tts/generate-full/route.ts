/**
 * POST /api/tts/generate-full
 *
 * Generates a full-length MP3 for a project's voiceover by:
 *   1. Splitting the text into ~3500-char sentence-boundary chunks
 *   2. Generating each chunk via edge-tts
 *   3. Concatenating all chunk MP3s (binary concat — works for MP3)
 *   4. Saving the merged audio path to the Voiceover record
 *
 * Body: { projectId, voice?, engine? }
 * Returns: { audioUrl, audioPath, chunks, totalChars, voice, engine }
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import {
  existsSync, mkdirSync, writeFileSync,
  unlinkSync, readFileSync, createWriteStream,
} from "fs";
import { statSync } from "fs";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

async function findPython(): Promise<string> {
  for (const cmd of ["python", "python3", "py"]) {
    try { await execAsync(`${cmd} --version`); return cmd; } catch { /* try next */ }
  }
  throw new Error("Python not found. Install Python 3 from https://python.org");
}

/** Split text into chunks at sentence boundaries, max ~chunkSize chars each */
function splitIntoChunks(text: string, chunkSize = 3500): string[] {
  const sentences = text.match(/[^.!?\n]+[.!?\n]+/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    if ((current + sentence).length > chunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 0);
}

/** Generate one chunk via edge-tts, return path to MP3 */
async function generateChunk(
  python: string,
  text: string,
  voice: string,
  outPath: string
): Promise<void> {
  const tmpTxt = outPath + ".tmp.txt";
  writeFileSync(tmpTxt, text, "utf-8");
  try {
    const cmd = `${python} -m edge_tts --voice "${voice}" --file "${tmpTxt}" --write-media "${outPath}"`;
    await execAsync(cmd, { timeout: 180000 });
  } finally {
    try { unlinkSync(tmpTxt); } catch { /* ignore */ }
  }
  // Verify output
  const size = existsSync(outPath) ? statSync(outPath).size : 0;
  if (size < 100) throw new Error(`Chunk generation failed — output empty: ${outPath}`);
}

/** Concatenate MP3 files by binary concat (valid for CBR/VBR MP3s) */
function concatMp3s(inputPaths: string[], outputPath: string): void {
  const ws = createWriteStream(outputPath);
  for (const p of inputPaths) {
    const data = readFileSync(p);
    ws.write(data);
  }
  ws.end();
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, voice = "en-US-AriaNeural", engine = "edge" } = body;

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // Load voiceover text
    const vo = await prisma.voiceover.findUnique({ where: { projectId } });
    if (!vo) return NextResponse.json({ error: "Voiceover not found — generate voiceover first" }, { status: 404 });

    if (engine !== "edge") {
      return NextResponse.json({ error: "Only engine=edge supported currently" }, { status: 400 });
    }

    let python: string;
    try { python = await findPython(); }
    catch (e) { return NextResponse.json({ error: String(e) }, { status: 503 }); }

    const outDir = join(process.cwd(), "public", "generated", "audio");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const text = vo.fullText;
    const chunks = splitIntoChunks(text, 3500);
    const chunkPaths: string[] = [];
    const ts = Date.now();

    // Generate each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = join(outDir, `chunk_${projectId}_${ts}_${i}.mp3`);
      await generateChunk(python, chunks[i], voice, chunkPath);
      chunkPaths.push(chunkPath);
    }

    // Merge all chunks into final MP3
    const finalFilename = `audio_${projectId}_${ts}.mp3`;
    const finalPath = join(outDir, finalFilename);

    if (chunkPaths.length === 1) {
      // Single chunk — just rename it
      const data = readFileSync(chunkPaths[0]);
      writeFileSync(finalPath, data);
    } else {
      concatMp3s(chunkPaths, finalPath);
    }

    // Wait for write to flush, then verify
    await new Promise((r) => setTimeout(r, 300));
    const finalSize = existsSync(finalPath) ? statSync(finalPath).size : 0;
    if (finalSize < 100) {
      return NextResponse.json({ error: "Final audio merge failed — output empty" }, { status: 500 });
    }

    // Clean up chunk files
    for (const p of chunkPaths) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }

    const audioUrl = `/generated/audio/${finalFilename}`;
    const audioPath = finalPath;

    // Save to DB
    await prisma.voiceover.update({
      where: { projectId },
      data: {
        audioPath,
        audioUrl,
        audioEngine: engine,
        audioVoice: voice,
        audioGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      audioUrl,
      audioPath,
      chunks: chunks.length,
      totalChars: text.length,
      fileSizeBytes: finalSize,
      voice,
      engine,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("No module named") || msg.includes("edge_tts")) {
      return NextResponse.json({
        error: "edge-tts not installed. Run: pip install edge-tts",
        install: "pip install edge-tts",
      }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
