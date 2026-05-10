/**
 * ComfyUI local image generation
 * Connects to a running ComfyUI instance at COMFYUI_URL (default: http://127.0.0.1:8188)
 * Uses the ComfyUI API workflow (not the UI workflow format)
 */

import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";
import { randomUUID } from "crypto";

const COMFYUI_URL = process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";
const COMFYUI_MODEL = process.env.COMFYUI_MODEL ?? "";
const COMFYUI_STEPS = parseInt(process.env.COMFYUI_STEPS ?? "20", 10);
const COMFYUI_CFG = parseFloat(process.env.COMFYUI_CFG ?? "7");
const POLL_INTERVAL_MS = 2000;
const MAX_WAIT_MS = 180_000; // 3 minutes

export interface ComfyUIStatus {
  running: boolean;
  models: string[];
  queue: number;
  error?: string;
}

/** Check if ComfyUI is running and return available checkpoints */
export async function getComfyUIStatus(): Promise<ComfyUIStatus> {
  try {
    const [statsRes, modelsRes] = await Promise.all([
      fetch(`${COMFYUI_URL}/system_stats`, { signal: AbortSignal.timeout(5000) }),
      fetch(`${COMFYUI_URL}/object_info/CheckpointLoaderSimple`, { signal: AbortSignal.timeout(5000) }),
    ]);

    if (!statsRes.ok) return { running: false, models: [], queue: 0, error: `HTTP ${statsRes.status}` };

    let models: string[] = [];
    if (modelsRes.ok) {
      const info = await modelsRes.json();
      models = info?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
    }

    // Get queue size
    let queue = 0;
    try {
      const queueRes = await fetch(`${COMFYUI_URL}/queue`, { signal: AbortSignal.timeout(3000) });
      if (queueRes.ok) {
        const queueData = await queueRes.json();
        queue = (queueData?.queue_running?.length ?? 0) + (queueData?.queue_pending?.length ?? 0);
      }
    } catch {
      // ignore queue fetch errors
    }

    return { running: true, models, queue };
  } catch (err) {
    return { running: false, models: [], queue: 0, error: String(err).slice(0, 100) };
  }
}

/** Build a simple txt2img API workflow for ComfyUI */
function buildWorkflow(
  prompt: string,
  negativePrompt: string,
  model: string,
  width: number,
  height: number,
  steps: number,
  cfg: number,
  seed: number
): Record<string, unknown> {
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: model },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: prompt,
        clip: ["1", 1],
      },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: negativePrompt,
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width, height, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps,
        cfg,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
    },
    "7": {
      class_type: "SaveImage",
      inputs: {
        filename_prefix: "autotube",
        images: ["6", 0],
      },
    },
  };
}

/** Auto-pick the best checkpoint from the available list */
function pickBestModel(models: string[]): string {
  if (!models.length) throw new Error("No checkpoint models found in ComfyUI");

  // Preference order: dreamshaper, realistic, deliberate, then anything
  const preferences = ["dreamshaper", "realistic", "deliberate", "epicrealism", "majicmix"];
  for (const pref of preferences) {
    const match = models.find((m) => m.toLowerCase().includes(pref));
    if (match) return match;
  }
  return models[0];
}

/** Generate an image via ComfyUI and save it locally */
export async function generateWithComfyUI(
  prompt: string,
  options: {
    width?: number;
    height?: number;
    negativePrompt?: string;
    seed?: number;
  } = {}
): Promise<{ url: string; localPath: string; source: string }> {
  const {
    width = 1280,
    height = 720,
    negativePrompt = "text, watermark, logo, blurry, ugly, deformed, bad anatomy, low quality, nsfw",
    seed = Math.floor(Math.random() * 2 ** 32),
  } = options;

  // 1. Check ComfyUI is running
  const status = await getComfyUIStatus();
  if (!status.running) {
    throw new Error(`ComfyUI not running at ${COMFYUI_URL}: ${status.error ?? "connection refused"}`);
  }

  // 2. Pick model
  const model = COMFYUI_MODEL || pickBestModel(status.models);

  // 3. Build and submit workflow
  const clientId = randomUUID();
  const workflow = buildWorkflow(prompt, negativePrompt, model, width, height, COMFYUI_STEPS, COMFYUI_CFG, seed);

  const promptRes = await fetch(`${COMFYUI_URL}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow, client_id: clientId }),
    signal: AbortSignal.timeout(15000),
  });

  if (!promptRes.ok) {
    const errText = await promptRes.text().catch(() => "");
    throw new Error(`ComfyUI /prompt error ${promptRes.status}: ${errText.slice(0, 200)}`);
  }

  const { prompt_id: promptId } = await promptRes.json();
  if (!promptId) throw new Error("ComfyUI returned no prompt_id");

  // 4. Poll history until complete
  const deadline = Date.now() + MAX_WAIT_MS;
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));

    const histRes = await fetch(`${COMFYUI_URL}/history/${promptId}`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!histRes.ok) continue;

    const history = await histRes.json();
    const entry = history[promptId];
    if (!entry) continue;

    // Check for errors in the output
    if (entry.status?.status_str === "error") {
      const msgs = entry.status?.messages ?? [];
      throw new Error(`ComfyUI generation error: ${JSON.stringify(msgs).slice(0, 200)}`);
    }

    // Find SaveImage output
    const outputs = entry.outputs ?? {};
    for (const nodeOutput of Object.values(outputs) as Record<string, unknown>[]) {
      const images = (nodeOutput as { images?: { filename: string; subfolder: string; type: string }[] }).images;
      if (!images?.length) continue;

      const img = images[0];
      // 5. Download the image
      const viewUrl = `${COMFYUI_URL}/view?filename=${encodeURIComponent(img.filename)}&subfolder=${encodeURIComponent(img.subfolder)}&type=${img.type}`;
      const imgRes = await fetch(viewUrl, { signal: AbortSignal.timeout(30000) });
      if (!imgRes.ok) throw new Error(`ComfyUI /view error ${imgRes.status}`);

      const buffer = Buffer.from(await imgRes.arrayBuffer());
      if (buffer.length < 5000) throw new Error("ComfyUI returned image too small — likely an error");

      // 6. Save locally
      const dir = join(process.cwd(), "public", "generated", "images");
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

      const filename = `comfy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.png`;
      const localPath = join(dir, filename);
      await writeFile(localPath, buffer);

      return {
        url: `/generated/images/${filename}`,
        localPath: `/generated/images/${filename}`,
        source: "comfyui",
      };
    }
  }

  throw new Error(`ComfyUI generation timed out after ${MAX_WAIT_MS / 1000}s for prompt_id ${promptId}`);
}
