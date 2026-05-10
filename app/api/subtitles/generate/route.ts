import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  segmentsToSRT,
  segmentsToVTT,
  voiceoverToSegments,
  parseGroqWhisperSegments,
  TranscriptSegment,
} from "@/lib/srt-generator";

const execAsync = promisify(exec);

// POST /api/subtitles/generate
// body: { projectId, audioPath? }
export async function POST(req: NextRequest) {
  try {
    const { projectId, audioPath } = await req.json();
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

    const project = await prisma.project.findUniqueOrThrow({
      where: { id: projectId },
      include: { voiceover: true },
    });

    let segments: TranscriptSegment[] = [];
    let method = "fallback";

    // ── 1. Try Groq Whisper API ────────────────────────────────────────────
    const resolvedAudioPath = audioPath ?? (project.voiceover as unknown as { audioPath?: string })?.audioPath;
    if (resolvedAudioPath && process.env.GROQ_API_KEY) {
      try {
        const audioFile = path.resolve(process.cwd(), "public", resolvedAudioPath.replace(/^\//, ""));
        if (fs.existsSync(audioFile)) {
          const fileBuffer = fs.readFileSync(audioFile);
          const formData = new FormData();
          formData.append("file", new Blob([fileBuffer], { type: "audio/mpeg" }), path.basename(audioFile));
          formData.append("model", "whisper-large-v3");
          formData.append("response_format", "verbose_json");
          formData.append("language", "en");

          const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
            method: "POST",
            headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
            body: formData,
            signal: AbortSignal.timeout(60000),
          });

          if (res.ok) {
            const data = await res.json();
            segments = parseGroqWhisperSegments(data);
            if (segments.length > 0) {
              method = "groq-whisper";
            }
          } else {
            console.warn("[subtitles] Groq Whisper failed:", res.status);
          }
        }
      } catch (e) {
        console.warn("[subtitles] Groq Whisper error:", e);
      }
    }

    // ── 2. Try local Whisper via Python ────────────────────────────────────
    if (segments.length === 0 && resolvedAudioPath) {
      try {
        const audioFile = path.resolve(process.cwd(), "public", resolvedAudioPath.replace(/^\//, ""));
        if (fs.existsSync(audioFile)) {
          const scriptPath = path.join(process.cwd(), "scripts", "whisper_transcribe.py");
          const tmpOutput = path.join(os.tmpdir(), `whisper_${Date.now()}.json`);

          if (fs.existsSync(scriptPath)) {
            const pythonCmds = ["python", "python3", "py"];
            let pythonCmd = "python";
            for (const cmd of pythonCmds) {
              try {
                await execAsync(`${cmd} --version`);
                pythonCmd = cmd;
                break;
              } catch { /* try next */ }
            }

            const { stdout } = await execAsync(
              `${pythonCmd} "${scriptPath}" "${audioFile}" "${tmpOutput}"`,
              { timeout: 120000 }
            );
            console.log("[subtitles] local whisper:", stdout.trim());

            if (fs.existsSync(tmpOutput)) {
              const json = JSON.parse(fs.readFileSync(tmpOutput, "utf-8"));
              segments = parseGroqWhisperSegments(json);
              if (segments.length > 0) method = "local-whisper";
              fs.unlinkSync(tmpOutput);
            }
          }
        }
      } catch (e) {
        console.warn("[subtitles] local Whisper error:", e);
      }
    }

    // ── 3. Fallback: generate from voiceover text ──────────────────────────
    if (segments.length === 0 && project.voiceover?.fullText) {
      segments = voiceoverToSegments(
        project.voiceover.fullText,
        project.voiceover.estimatedDuration || project.duration * 60
      );
      method = "voiceover-text";
    }

    if (segments.length === 0) {
      return NextResponse.json({ error: "No audio or voiceover text available to generate subtitles" }, { status: 400 });
    }

    // ── 4. Write SRT and VTT files ─────────────────────────────────────────
    const dir = path.join(process.cwd(), "public", "generated", "subtitles");
    fs.mkdirSync(dir, { recursive: true });

    const srtContent = segmentsToSRT(segments);
    const vttContent = segmentsToVTT(segments);

    const srtFile = `subtitles_${projectId}.srt`;
    const vttFile = `subtitles_${projectId}.vtt`;

    fs.writeFileSync(path.join(dir, srtFile), srtContent, "utf-8");
    fs.writeFileSync(path.join(dir, vttFile), vttContent, "utf-8");

    const srtPath = `/generated/subtitles/${srtFile}`;
    const vttPath = `/generated/subtitles/${vttFile}`;

    // ── 5. Update project DB ───────────────────────────────────────────────
    await prisma.project.update({
      where: { id: projectId },
      data: {
        subtitleSrtPath: srtPath,
        subtitleVttPath: vttPath,
      } as Parameters<typeof prisma.project.update>[0]["data"],
    });

    return NextResponse.json({
      ok: true,
      method,
      segments: segments.length,
      srtPath,
      vttPath,
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
