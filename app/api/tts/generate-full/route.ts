/**
 * POST /api/tts/generate-full
 *
 * Generates a full-length MP3 for a project's voiceover.
 *
 * Engines (FREE):
 *   edge     — Microsoft Edge TTS (free, Python required, high quality neural)
 *   gtts     — Google Text-to-Speech (free, needs internet)
 *   alltalk  — AllTalk TTS local server (http://localhost:7851)
 *   kokoro   — Kokoro TTS local server (http://localhost:8880, OpenAI-compat)
 *   fish     — Fish Speech local server (http://localhost:8080)
 *
 * Engines (PAID):
 *   openai   — OpenAI TTS API (~$15/1M chars, needs OPENAI_API_KEY)
 *
 * Local servers reachable from Docker via host.docker.internal.
 * Override URL with env vars: ALLTALK_URL, KOKORO_URL, FISH_SPEECH_URL
 *
 * Body: { projectId, voice?, engine? }
 * Returns: { audioUrl, chunks, totalChars, fileSizeBytes, voice, engine }
 */

import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, readFileSync } from "fs";
import { statSync } from "fs";
import { prisma } from "@/lib/prisma";

const execAsync = promisify(exec);

// ── Helpers ───────────────────────────────────────────────────────────────────

async function findPython(): Promise<string> {
  for (const cmd of ["python3", "python", "py"]) {
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

/** Concatenate MP3 buffers (binary concat is valid for MP3) */
function concatMp3s(inputPaths: string[], outputPath: string): void {
  const parts = inputPaths.map((p) => readFileSync(p));
  writeFileSync(outputPath, Buffer.concat(parts));
}

// ── Edge TTS chunk generator ──────────────────────────────────────────────────

async function generateChunkEdge(
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
  const size = existsSync(outPath) ? statSync(outPath).size : 0;
  if (size < 100) throw new Error(`Chunk TTS output empty: ${outPath}`);
}

// ── gTTS chunk generator ──────────────────────────────────────────────────────

async function generateChunkGtts(
  python: string,
  text: string,
  lang: string,
  outPath: string
): Promise<void> {
  const tmpTxt = outPath + ".tmp.txt";
  const tmpPy  = outPath + ".tmp.py";
  writeFileSync(tmpTxt, text, "utf-8");
  const pyScript = `from gtts import gTTS
with open(r"${tmpTxt}", "r", encoding="utf-8") as f:
    t = f.read()
tts = gTTS(text=t, lang="${lang}", slow=False)
tts.save(r"${outPath}")
print("ok")
`;
  writeFileSync(tmpPy, pyScript, "utf-8");
  try {
    await execAsync(`${python} "${tmpPy}"`, { timeout: 120000 });
  } finally {
    try { unlinkSync(tmpTxt); } catch { /* ignore */ }
    try { unlinkSync(tmpPy);  } catch { /* ignore */ }
  }
  const size = existsSync(outPath) ? statSync(outPath).size : 0;
  if (size < 100) throw new Error(`gTTS chunk output empty: ${outPath}`);
}

// ── AllTalk TTS chunk generator ───────────────────────────────────────────────
// AllTalk API: POST /api/tts-generate (form-data) or /api/generate (JSON v2)
// Default port: 7851

async function generateChunkAllTalk(
  text: string,
  voice: string,
  outPath: string
): Promise<void> {
  const base = process.env.ALLTALK_URL ?? "http://host.docker.internal:7851";
  const form = new FormData();
  form.append("text_input", text);
  form.append("text_filtering", "standard");
  form.append("character_voice_gen", voice || "female_01.wav");
  form.append("narrator_enabled", "false");
  form.append("narrator_voice_gen", "male_01.wav");
  form.append("output_file_name", `chunk_at_${Date.now()}`);
  form.append("output_file_timestamp", "true");
  form.append("autoplay", "false");
  form.append("autoplay_volume", "0.8");

  const res = await fetch(`${base}/api/tts-generate`, {
    method: "POST", body: form,
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`AllTalk error ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json() as { output_file_url?: string; output_file_path?: string };
  // AllTalk returns a URL to the file on its server — fetch and save it
  const fileUrl = json.output_file_url ?? json.output_file_path;
  if (!fileUrl) throw new Error("AllTalk returned no output file URL");
  const dlBase = process.env.ALLTALK_URL ?? "http://host.docker.internal:7851";
  const dlUrl = fileUrl.startsWith("http") ? fileUrl : `${dlBase}${fileUrl}`;
  const dlRes = await fetch(dlUrl, { signal: AbortSignal.timeout(30000) });
  if (!dlRes.ok) throw new Error(`AllTalk file download failed: ${dlRes.status}`);
  writeFileSync(outPath, Buffer.from(await dlRes.arrayBuffer()));
  const size = statSync(outPath).size;
  if (size < 100) throw new Error("AllTalk output empty");
}

// ── Kokoro TTS chunk generator ────────────────────────────────────────────────
// Kokoro uses OpenAI-compatible API on port 8880
// Voices: af_bella, af_sarah, am_adam, bf_emma, bm_george, af_sky, etc.

async function generateChunkKokoro(
  text: string,
  voice: string,
  outPath: string
): Promise<void> {
  const base = process.env.KOKORO_URL ?? "http://host.docker.internal:8880";
  const res = await fetch(`${base}/v1/audio/speech`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "kokoro",
      input: text,
      voice: voice || "af_bella",
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(120000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Kokoro error ${res.status}: ${err.slice(0, 200)}`);
  }
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  const size = statSync(outPath).size;
  if (size < 100) throw new Error("Kokoro output empty");
}

// ── Fish Speech chunk generator ───────────────────────────────────────────────
// Fish Speech API: POST /v1/tts on port 8080

async function generateChunkFish(
  text: string,
  voice: string,
  outPath: string
): Promise<void> {
  const base = process.env.FISH_SPEECH_URL ?? "http://host.docker.internal:8080";
  const res = await fetch(`${base}/v1/tts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text,
      format: "mp3",
      streaming: false,
      ...(voice ? { reference_id: voice } : {}),
    }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Fish Speech error ${res.status}: ${err.slice(0, 200)}`);
  }
  writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  const size = statSync(outPath).size;
  if (size < 100) throw new Error("Fish Speech output empty");
}

// ── OpenAI TTS chunk generator ────────────────────────────────────────────────

async function generateChunkOpenAI(
  text: string,
  voice: string,
  outPath: string
): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set in .env.local");

  // OpenAI TTS max 4096 chars per request
  const truncated = text.slice(0, 4096);
  const res = await fetch("https://api.openai.com/v1/audio/speech", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "tts-1",
      input: truncated,
      voice,        // alloy | echo | fable | onyx | nova | shimmer
      response_format: "mp3",
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`OpenAI TTS error ${res.status}: ${err.slice(0, 200)}`);
  }

  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(outPath, buf);

  const size = statSync(outPath).size;
  if (size < 100) throw new Error(`OpenAI TTS output empty`);
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, voice, engine = "edge" } = body;

    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    // Default voices per engine
    const defaultVoice: Record<string, string> = {
      edge:    "en-US-AriaNeural",
      gtts:    "en",
      openai:  "nova",
      alltalk: "female_01.wav",
      kokoro:  "af_bella",
      fish:    "",
    };
    const finalVoice = voice ?? (defaultVoice[engine] ?? "");

    // Load voiceover text
    const vo = await prisma.voiceover.findUnique({ where: { projectId } });
    if (!vo) return NextResponse.json({ error: "Voiceover not found — generate voiceover script first" }, { status: 404 });

    const LOCAL_SERVERS = ["alltalk", "kokoro", "fish"];
    const VALID_ENGINES = ["edge", "gtts", "openai", ...LOCAL_SERVERS];
    if (!VALID_ENGINES.includes(engine)) {
      return NextResponse.json({ error: `engine must be one of: ${VALID_ENGINES.join(", ")}` }, { status: 400 });
    }

    const outDir = join(process.cwd(), "public", "generated", "audio");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const text = vo.fullText;
    // Local servers & OpenAI handle longer chunks; edge/gtts safer at 3500
    const chunkSize = (engine === "openai" || engine === "kokoro" || engine === "alltalk" || engine === "fish") ? 4000 : 3500;
    const chunks = splitIntoChunks(text, chunkSize);
    const chunkPaths: string[] = [];
    const ts = Date.now();

    let python = "";
    if (engine === "edge" || engine === "gtts") {
      try { python = await findPython(); }
      catch (e) { return NextResponse.json({ error: String(e) }, { status: 503 }); }
    }

    // Generate each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunkPath = join(outDir, `chunk_${projectId}_${ts}_${i}.mp3`);
      if (engine === "edge") {
        await generateChunkEdge(python, chunks[i], finalVoice, chunkPath);
      } else if (engine === "gtts") {
        await generateChunkGtts(python, chunks[i], finalVoice, chunkPath);
      } else if (engine === "alltalk") {
        await generateChunkAllTalk(chunks[i], finalVoice, chunkPath);
      } else if (engine === "kokoro") {
        await generateChunkKokoro(chunks[i], finalVoice, chunkPath);
      } else if (engine === "fish") {
        await generateChunkFish(chunks[i], finalVoice, chunkPath);
      } else {
        await generateChunkOpenAI(chunks[i], finalVoice, chunkPath);
      }
      chunkPaths.push(chunkPath);
    }

    // Merge all chunks into one final MP3
    const finalFilename = `audio_${projectId}_${ts}.mp3`;
    const finalPath = join(outDir, finalFilename);
    concatMp3s(chunkPaths, finalPath);

    // Verify final output
    const finalSize = existsSync(finalPath) ? statSync(finalPath).size : 0;
    if (finalSize < 100) {
      return NextResponse.json({ error: "Final audio merge failed — output empty" }, { status: 500 });
    }

    // Clean up chunk files
    for (const p of chunkPaths) {
      try { unlinkSync(p); } catch { /* ignore */ }
    }

    const audioUrl = `/generated/audio/${finalFilename}`;

    // Save to DB
    await prisma.voiceover.update({
      where: { projectId },
      data: {
        audioPath: finalPath,
        audioUrl,
        audioEngine: engine,
        audioVoice: finalVoice,
        audioGeneratedAt: new Date(),
      },
    });

    return NextResponse.json({
      audioUrl,
      chunks: chunks.length,
      totalChars: text.length,
      fileSizeBytes: finalSize,
      voice: finalVoice,
      engine,
    });

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("No module named edge_tts") || msg.includes("edge_tts")) {
      return NextResponse.json({ error: "edge-tts not installed. Run: pip install edge-tts", install: "pip install edge-tts" }, { status: 503 });
    }
    if (msg.includes("No module named gtts") || msg.includes("gtts")) {
      return NextResponse.json({ error: "gTTS not installed. Run: pip install gtts", install: "pip install gtts" }, { status: 503 });
    }
    if (msg.includes("ECONNREFUSED") || msg.includes("fetch failed") || msg.includes("connect ECONNREFUSED")) {
      return NextResponse.json({ error: `Local TTS server not running. Start your server first.\n${msg}` }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
