/**
 * Thumbnail generator using Sharp + Pollinations.ai background.
 * Produces a 1280×720 PNG saved to public/generated/thumbnails/.
 */
import * as fs from "fs";
import * as path from "path";

interface ThumbnailOptions {
  title: string;
  subtitle?: string;
  style?: string;      // "dramatic" | "minimal" | "bold"
  bgPrompt?: string;   // custom background prompt (optional)
}

interface ThumbnailResult {
  localPath: string;   // relative path from cwd (e.g. public/generated/thumbnails/...)
  url: string;         // public URL path (e.g. /generated/thumbnails/...)
}

const WIDTH = 1280;
const HEIGHT = 720;

function wrapText(text: string, maxCharsPerLine: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length <= maxCharsPerLine) {
      current = (current + " " + word).trim();
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function buildSvgOverlay(title: string, subtitle?: string): Buffer {
  const lines = wrapText(title.toUpperCase(), 22);
  const lineHeight = 92;
  const topY = Math.max(100, HEIGHT / 2 - (lines.length * lineHeight) / 2);

  const titleElements = lines
    .map(
      (line, i) => `
    <text
      x="${WIDTH / 2}"
      y="${topY + i * lineHeight}"
      text-anchor="middle"
      font-family="Arial Black, Impact, sans-serif"
      font-size="84"
      font-weight="900"
      fill="white"
      stroke="black"
      stroke-width="6"
      paint-order="stroke"
    >${escapeXml(line)}</text>`
    )
    .join("\n");

  const subtitleEl = subtitle
    ? `<text
        x="${WIDTH / 2}"
        y="${HEIGHT - 60}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="42"
        font-weight="bold"
        fill="#FFD700"
        stroke="black"
        stroke-width="3"
        paint-order="stroke"
      >${escapeXml(subtitle)}</text>`
    : "";

  // Gradient overlay for readability
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
  <defs>
    <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#000000" stop-opacity="0.3"/>
      <stop offset="40%" stop-color="#000000" stop-opacity="0.1"/>
      <stop offset="70%" stop-color="#000000" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#000000" stop-opacity="0.7"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#grad)"/>
  ${titleElements}
  ${subtitleEl}
</svg>`;

  return Buffer.from(svg);
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function downloadBackgroundImage(prompt: string): Promise<Buffer | null> {
  const encodedPrompt = encodeURIComponent(
    `${prompt}, cinematic, high quality, 16:9 aspect ratio, YouTube thumbnail style`
  );
  const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=${WIDTH}&height=${HEIGHT}&nologo=true&seed=${Math.floor(Math.random() * 9999)}`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 5000) return null; // too small, likely error
    return buf;
  } catch {
    return null;
  }
}

async function generateFallbackBackground(style: string): Promise<Buffer> {
  // Import sharp dynamically to avoid SSR issues
  const sharp = (await import("sharp")).default;

  // Generate a gradient background as fallback
  const colors: Record<string, { top: string; bottom: string }> = {
    dramatic: { top: "#1a0a2e", bottom: "#16213e" },
    minimal:  { top: "#0f0f0f", bottom: "#1a1a2e" },
    bold:     { top: "#2d1b00", bottom: "#1a0a2e" },
  };
  const c = colors[style] ?? colors.dramatic;

  const svgBg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="${c.top}"/>
        <stop offset="100%" stop-color="${c.bottom}"/>
      </linearGradient>
    </defs>
    <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#bg)"/>
  </svg>`;

  return sharp(Buffer.from(svgBg)).png().toBuffer();
}

export async function generateThumbnail(
  projectId: string,
  options: ThumbnailOptions
): Promise<ThumbnailResult> {
  const sharp = (await import("sharp")).default;

  const { title, subtitle, style = "dramatic", bgPrompt } = options;

  // Build background image prompt
  const backgroundPrompt =
    bgPrompt ??
    `${title}, ${style} cinematic scene, dark moody atmosphere, no text, ultra HD`;

  // Download background from Pollinations
  let bgBuffer = await downloadBackgroundImage(backgroundPrompt);
  if (!bgBuffer) {
    console.warn("[thumbnail] Pollinations failed, using gradient fallback");
    bgBuffer = await generateFallbackBackground(style);
  }

  // Resize background to exact dimensions
  const bg = await sharp(bgBuffer).resize(WIDTH, HEIGHT, { fit: "cover" }).png().toBuffer();

  // Build SVG overlay
  const overlay = buildSvgOverlay(title, subtitle);

  // Composite: background + text overlay
  const finalBuffer = await sharp(bg)
    .composite([{ input: overlay, blend: "over" }])
    .png()
    .toBuffer();

  // Save to disk
  const dir = path.join(process.cwd(), "public", "generated", "thumbnails");
  fs.mkdirSync(dir, { recursive: true });

  const filename = `thumbnail_${projectId}_${Date.now()}.png`;
  const localPath = path.join(dir, filename);
  fs.writeFileSync(localPath, finalBuffer);

  const urlPath = `/generated/thumbnails/${filename}`;

  return {
    localPath: `public/generated/thumbnails/${filename}`,
    url: urlPath,
  };
}
