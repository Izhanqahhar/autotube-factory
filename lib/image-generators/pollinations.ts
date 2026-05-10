/**
 * Pollinations.ai — FREE image generation, no API key needed
 * Uses Flux model by default (best quality)
 * Includes retry with exponential backoff for 429 rate limits
 */

import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export type PollinationsModel = "flux" | "flux-realism" | "flux-anime" | "flux-3d" | "flux-cablyai" | "turbo";

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateWithPollinations(
  prompt: string,
  options: {
    width?: number;
    height?: number;
    model?: PollinationsModel;
    seed?: number;
    nologo?: boolean;
    enhance?: boolean;
  } = {}
): Promise<{ url: string; localPath: string; source: string }> {
  const {
    width = 1280,
    height = 720,
    model = "flux",
    nologo = true,
    enhance = false,
    seed,
  } = options;

  const encodedPrompt = encodeURIComponent(prompt.slice(0, 500));
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    model,
    nologo: String(nologo),
    enhance: String(enhance),
    ...(seed !== undefined ? { seed: String(seed) } : {}),
  });

  const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?${params}`;

  // Retry up to 3 times with backoff on 429 / transient errors
  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 3s, 9s
      const delay = 3000 * Math.pow(3, attempt - 1);
      console.log(`[Pollinations] Retry ${attempt}/${maxRetries - 1} after ${delay}ms...`);
      await sleep(delay);
    }

    try {
      const res = await fetch(imageUrl, { signal: AbortSignal.timeout(90000) });

      if (res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const waitMs = retryAfter ? Number(retryAfter) * 1000 : 5000;
        console.warn(`[Pollinations] Rate limited (429). Waiting ${waitMs}ms...`);
        await sleep(Math.min(waitMs, 15000));
        lastError = new Error(`Pollinations rate limited (429)`);
        continue;
      }

      if (!res.ok) {
        lastError = new Error(`Pollinations error: ${res.status}`);
        if (res.status >= 500) continue; // retry on server errors
        throw lastError; // don't retry on 4xx client errors
      }

      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.length < 1000) {
        lastError = new Error(`Pollinations returned empty image (${buffer.length} bytes)`);
        continue;
      }

      const dir = join(process.cwd(), "public", "generated", "images");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const filename = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
      const localPath = join(dir, filename);
      await writeFile(localPath, buffer);

      return {
        url: imageUrl,
        localPath: `/generated/images/${filename}`,
        source: "pollinations",
      };
    } catch (e) {
      if (e instanceof Error && e.name === "TimeoutError") {
        lastError = new Error("Pollinations timeout after 90s");
        continue;
      }
      lastError = e instanceof Error ? e : new Error(String(e));
      if (attempt < maxRetries - 1) continue;
    }
  }

  throw lastError ?? new Error("Pollinations failed after retries");
}
