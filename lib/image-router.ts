import { generateWithPollinations } from "@/lib/image-generators/pollinations";
import { generateWithHuggingFace, searchUnsplash, searchPexels, searchPixabay } from "@/lib/image-generators/stock";
import { generateWithComfyUI, getComfyUIStatus } from "@/lib/image-generators/comfyui";

export type ImageSource = "comfyui" | "pollinations" | "huggingface" | "unsplash" | "pexels" | "pixabay" | "auto";

export interface ImageResult {
  url: string;
  localPath: string;
  source: string;
}

// Cache ComfyUI availability for 30s to avoid repeated health checks
let comfyUIAvailable: boolean | null = null;
let comfyUICheckedAt = 0;
const COMFYUI_CACHE_TTL = 30_000;

async function isComfyUIAvailable(): Promise<boolean> {
  if (comfyUIAvailable !== null && Date.now() - comfyUICheckedAt < COMFYUI_CACHE_TTL) {
    return comfyUIAvailable;
  }
  // Only check if COMFYUI_URL is configured (or using default)
  const url = process.env.COMFYUI_URL ?? "http://127.0.0.1:8188";
  // Skip if explicitly disabled
  if (process.env.COMFYUI_ENABLED === "false") {
    comfyUIAvailable = false;
    comfyUICheckedAt = Date.now();
    return false;
  }
  try {
    const status = await getComfyUIStatus();
    comfyUIAvailable = status.running && status.models.length > 0;
    comfyUICheckedAt = Date.now();
    return comfyUIAvailable;
  } catch {
    comfyUIAvailable = false;
    comfyUICheckedAt = Date.now();
    return false;
  }
}

/**
 * Get an image for a prompt using the best available source.
 * Priority (auto mode): ComfyUI (local) → Pollinations (free) → HuggingFace → stock photos
 */
export async function getImageForPrompt(
  prompt: string,
  imageType = "scene",
  preferredSource: ImageSource = "auto",
  options: { width?: number; height?: number } = {}
): Promise<ImageResult> {
  const errors: string[] = [];

  async function tryComfyUI() {
    return generateWithComfyUI(prompt, {
      width: options.width ?? 1280,
      height: options.height ?? 720,
    });
  }

  async function tryPollinations() {
    return generateWithPollinations(prompt, {
      width: options.width ?? 1280,
      height: options.height ?? 720,
      model: "flux",
    });
  }

  async function tryHuggingFace() {
    return generateWithHuggingFace(prompt, options);
  }

  // For stock-type images try real photos first
  const isStockType = ["background", "broll", "product"].some((t) => imageType.toLowerCase().includes(t));

  const chain: (() => Promise<ImageResult>)[] = [];

  if (preferredSource === "comfyui") {
    chain.push(tryComfyUI, tryPollinations);
  } else if (preferredSource === "pollinations") {
    chain.push(tryPollinations);
  } else if (preferredSource === "huggingface") {
    chain.push(tryHuggingFace, tryPollinations);
  } else if (preferredSource === "unsplash") {
    chain.push(() => searchUnsplash(prompt).then((r) => r!), tryPollinations);
  } else if (preferredSource === "pexels") {
    chain.push(() => searchPexels(prompt).then((r) => r!), tryPollinations);
  } else if (preferredSource === "pixabay") {
    chain.push(() => searchPixabay(prompt).then((r) => r!), tryPollinations);
  } else {
    // auto — ComfyUI first if available (local, highest quality), then cloud sources
    const comfyAvailable = await isComfyUIAvailable();

    if (isStockType) {
      const stockChain: (() => Promise<ImageResult>)[] = [
        () => searchUnsplash(prompt).then((r) => r!),
        () => searchPexels(prompt).then((r) => r!),
        () => searchPixabay(prompt).then((r) => r!),
        tryPollinations,
      ];
      if (comfyAvailable) chain.push(tryComfyUI);
      chain.push(...stockChain);
    } else {
      if (comfyAvailable) chain.push(tryComfyUI);
      chain.push(
        tryPollinations,
        tryHuggingFace,
        () => searchUnsplash(prompt).then((r) => r!),
        () => searchPexels(prompt).then((r) => r!)
      );
    }
  }

  for (const fn of chain) {
    try {
      const result = await fn();
      if (result?.url) return result;
    } catch (e) {
      const msg = String(e).slice(0, 150);
      errors.push(msg);
      // If ComfyUI times out, invalidate its cache so we don't keep trying
      if (msg.includes("ComfyUI") || msg.includes("127.0.0.1:8188") || msg.includes("host.docker.internal:8188")) {
        comfyUIAvailable = false;
        comfyUICheckedAt = Date.now();
      }
      // If Pollinations is rate-limited even after retries, continue to next source
      if (msg.includes("rate limited") || msg.includes("429")) {
        console.warn("[image-router] Pollinations rate limited — trying next source");
        continue;
      }
    }
  }

  throw new Error(`All image sources failed for prompt "${prompt.slice(0, 60)}":\n${errors.join("; ")}`);
}
