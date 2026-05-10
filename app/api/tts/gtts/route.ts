import { NextRequest, NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { existsSync, mkdirSync, writeFileSync, unlinkSync, statSync } from "fs";

const execAsync = promisify(exec);

async function findPython(): Promise<string> {
  for (const cmd of ["python", "python3", "py"]) {
    try {
      await execAsync(`${cmd} --version`);
      return cmd;
    } catch { /* try next */ }
  }
  throw new Error("Python not found. Install Python 3 from https://python.org");
}

// POST /api/tts/gtts
// body: { text, lang?, filename? }
// Requires: pip install gtts
export async function POST(req: NextRequest) {
  try {
    const { text, lang = "en", filename } = await req.json();
    if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

    const outDir = join(process.cwd(), "public", "generated", "audio");
    if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

    const safeFilename = (filename ?? `gtts_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "_") + ".mp3";
    const outPath = join(outDir, safeFilename).replace(/\\/g, "/");

    // Write text to temp file — avoids all shell quoting / injection issues
    const tempTextFile = join(outDir, `_tmp_gtts_${Date.now()}.txt`).replace(/\\/g, "/");
    writeFileSync(tempTextFile, text.slice(0, 4000), "utf-8");

    // Write a small Python script to a temp file
    const scriptFile = join(outDir, `_tmp_gtts_${Date.now()}.py`).replace(/\\/g, "/");
    const pyScript = `import sys
from gtts import gTTS
with open(r"${tempTextFile}", "r", encoding="utf-8") as f:
    text = f.read()
tts = gTTS(text=text, lang="${lang}", slow=False)
tts.save(r"${outPath}")
print("ok")
`;
    writeFileSync(scriptFile, pyScript, "utf-8");

    let python: string;
    try {
      python = await findPython();
    } catch (e) {
      return NextResponse.json({ error: String(e) }, { status: 503 });
    }

    try {
      await execAsync(`${python} "${scriptFile}"`, { timeout: 60000 });
    } finally {
      try { unlinkSync(tempTextFile); } catch { /* ignore */ }
      try { unlinkSync(scriptFile); } catch { /* ignore */ }
    }

    let sizeBytes = 0;
    try {
      sizeBytes = statSync(outPath).size;
      if (sizeBytes < 100) throw new Error("Output too small");
    } catch {
      return NextResponse.json({ error: "gTTS generation failed — output missing" }, { status: 500 });
    }

    return NextResponse.json({
      path: `/api/audio/${safeFilename}`,
      engine: "gtts",
      lang,
      sizeBytes,
    });
  } catch (e: unknown) {
    const msg = String(e instanceof Error ? e.message : e);
    if (msg.includes("No module named") || msg.includes("gtts")) {
      return NextResponse.json({
        error: "gTTS not installed. Run: pip install gtts",
        install: "pip install gtts",
      }, { status: 503 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
