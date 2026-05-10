import { writeFile } from "fs/promises";
import { join } from "path";
import { existsSync, mkdirSync } from "fs";

export async function generateWithHuggingFace(
  prompt: string,
  options: { width?: number; height?: number; model?: string } = {}
): Promise<{ url: string; localPath: string; source: string }> {
  const apiKey = process.env.HUGGINGFACE_API_KEY;
  if (!apiKey) throw new Error("HUGGINGFACE_API_KEY not set");

  const model = options.model ?? "stabilityai/stable-diffusion-xl-base-1.0";
  const res = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ inputs: prompt }),
    signal: AbortSignal.timeout(90000),
  });

  if (!res.ok) throw new Error(`HuggingFace image error: ${res.status} ${await res.text()}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const dir = join(process.cwd(), "public", "generated", "images");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const filename = `hf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.jpg`;
  await writeFile(join(dir, filename), buffer);

  return { url: `/generated/images/${filename}`, localPath: `/generated/images/${filename}`, source: "huggingface" };
}

export async function searchUnsplash(
  query: string
): Promise<{ url: string; localPath: string; source: string } | null> {
  const key = process.env.UNSPLASH_ACCESS_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape&count=1`,
    { headers: { Authorization: `Client-ID ${key}` }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const photo = Array.isArray(data) ? data[0] : data;
  const imageUrl = photo?.urls?.regular;
  if (!imageUrl) return null;
  return { url: imageUrl, localPath: imageUrl, source: "unsplash" };
}

export async function searchPexels(
  query: string
): Promise<{ url: string; localPath: string; source: string } | null> {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`,
    { headers: { Authorization: key }, signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const photo = data?.photos?.[0];
  const imageUrl = photo?.src?.large2x ?? photo?.src?.large;
  if (!imageUrl) return null;
  return { url: imageUrl, localPath: imageUrl, source: "pexels" };
}

export async function searchPixabay(
  query: string
): Promise<{ url: string; localPath: string; source: string } | null> {
  const key = process.env.PIXABAY_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://pixabay.com/api/?key=${key}&q=${encodeURIComponent(query)}&image_type=photo&orientation=horizontal&per_page=3`,
    { signal: AbortSignal.timeout(10000) }
  );
  if (!res.ok) return null;
  const data = await res.json();
  const hit = data?.hits?.[0];
  if (!hit?.largeImageURL) return null;
  return { url: hit.largeImageURL, localPath: hit.largeImageURL, source: "pixabay" };
}
