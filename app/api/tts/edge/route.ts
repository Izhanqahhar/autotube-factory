import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from "fs";
import { statSync } from "fs";

const execAsync = promisify(exec);

// Try python, then python3 (Windows uses "python", Linux/Mac uses "python3")
async function findPython(): Promise<string> {
  for (const cmd of ["python", "python3", "py"]) {
    try {
      await execAsync(`${cmd} --version`);
      return cmd;
    } catch {
      // try next
    }
  }
  throw new Error("Python not found. Install Python 3 from https://python.org");
}

// POST /api/tts/edge
// body: { text, voice?, filename? }
// Requires: pip install edge-tts
export async function POST(req: NextRequest) {
  try {
    const { text, voice = "en-US-AriaNeural", filename } = await req.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const outDir = join(process.cwd(), "public", "generated", "audio");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const safeFilename = (filename ?? `edge_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_") + ".mp3";
    const outPath = join(outDir, safeFilename);

    // Write text to a temp file to avoid shell injection / quoting issues
    const tempFile = join(outDir, `_tmp_${Date.now()}.txt`);
    writeFileSync(tempFile, text.slice(0, 4000), "utf-8");

    let python: string;
    try {
      python = await findPython();
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 503 });
    }

    try {
      // Use --file flag to read from temp file instead of --text (avoids all quoting issues)
      const cmd = `${python} -m edge_tts --voice "${voice}" --file "${tempFile}" --write-media "${outPath}"`;
      await execAsync(cmd, { timeout: 120000 });
    } finally {
      try { unlinkSync(tempFile); } catch { /* ignore */ }
    }

    // Verify output
    let sizeBytes = 0;
    try {
      sizeBytes = statSync(outPath).size;
      if (sizeBytes < 100) throw new Error("Output file too small");
    } catch {
      return NextResponse.json({ error: "Audio generation failed — output file missing or empty" }, { status: 500 });
    }

    return NextResponse.json({
      path: `/generated/audio/${safeFilename}`,
      voice,
      engine: "edge-tts",
      sizeBytes,
    });
  } catch (e: unknown) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes("No module named") || msg.includes("edge_tts")) {
      return NextResponse.json({
        error: "edge-tts not installed. Run: pip install edge-tts",
        install: "pip install edge-tts",
      }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/tts/edge/voices
export async function GET() {
  return NextResponse.json({
    voices: [
      { id: "en-US-AriaNeural", name: "Aria (US Female)", lang: "en-US" },
      { id: "en-US-GuyNeural", name: "Guy (US Male)", lang: "en-US" },
      { id: "en-US-JennyNeural", name: "Jenny (US Female, Friendly)", lang: "en-US" },
      { id: "en-US-TonyNeural", name: "Tony (US Male, Confident)", lang: "en-US" },
      { id: "en-US-SaraNeural", name: "Sara (US Female, Professional)", lang: "en-US" },
      { id: "en-US-DavisNeural", name: "Davis (US Male, Casual)", lang: "en-US" },
      { id: "en-US-AndrewNeural", name: "Andrew (US Male)", lang: "en-US" },
      { id: "en-GB-SoniaNeural", name: "Sonia (British Female)", lang: "en-GB" },
      { id: "en-GB-RyanNeural", name: "Ryan (British Male)", lang: "en-GB" },
      { id: "en-GB-LibbyNeural", name: "Libby (British Female)", lang: "en-GB" },
      { id: "en-AU-NatashaNeural", name: "Natasha (Australian Female)", lang: "en-AU" },
      { id: "en-AU-WilliamNeural", name: "William (Australian Male)", lang: "en-AU" },
      { id: "en-IN-NeerjaNeural", name: "Neerja (Indian English Female)", lang: "en-IN" },
      { id: "en-CA-ClaraNeural", name: "Clara (Canadian Female)", lang: "en-CA" },
    ],
    install: "pip install edge-tts",
    docs: "https://github.com/rany2/edge-tts",
  });
}
