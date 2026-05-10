/**
 * Pure TypeScript SRT / VTT generator.
 * Works from either Groq Whisper word-segments or voiceover script segments.
 */

export interface TranscriptSegment {
  text: string;
  start: number; // seconds
  end: number;   // seconds
}

// ── SRT ──────────────────────────────────────────────────────────────────────

function srtTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

function vttTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}.${pad3(ms)}`;
}

function pad2(n: number) { return String(n).padStart(2, "0"); }
function pad3(n: number) { return String(n).padStart(3, "0"); }

/**
 * Convert segments to SRT subtitle format.
 */
export function segmentsToSRT(segments: TranscriptSegment[]): string {
  return segments
    .map((seg, i) => {
      const start = srtTimestamp(seg.start);
      const end = srtTimestamp(seg.end);
      return `${i + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

/**
 * Convert segments to WebVTT format.
 */
export function segmentsToVTT(segments: TranscriptSegment[]): string {
  const body = segments
    .map((seg) => {
      const start = vttTimestamp(seg.start);
      const end = vttTimestamp(seg.end);
      return `${start} --> ${end}\n${seg.text.trim()}\n`;
    })
    .join("\n");

  return `WEBVTT\n\n${body}`;
}

/**
 * Split long voiceover text into subtitle-sized segments by sentence.
 * Used when no audio-based transcript is available.
 */
export function voiceoverToSegments(
  fullText: string,
  totalDurationSeconds: number
): TranscriptSegment[] {
  // Split on sentence boundaries
  const sentences = fullText
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (!sentences.length) return [];

  // Average speaking rate: ~150 words/min = 2.5 words/sec
  const wordsPerSecond = 2.5;
  const segments: TranscriptSegment[] = [];
  let currentTime = 0;

  for (const sentence of sentences) {
    const words = sentence.split(/\s+/).length;
    const duration = Math.max(words / wordsPerSecond, 0.5);
    segments.push({
      text: sentence,
      start: currentTime,
      end: currentTime + duration,
    });
    currentTime += duration + 0.15; // 150ms gap between subtitles
  }

  // Normalize to fit total duration if provided and reasonable
  if (totalDurationSeconds > 0 && currentTime > 0) {
    const scale = totalDurationSeconds / currentTime;
    if (scale > 0.5 && scale < 3) {
      return segments.map((s) => ({
        ...s,
        start: s.start * scale,
        end: s.end * scale,
      }));
    }
  }

  return segments;
}

/**
 * Parse Groq Whisper verbose_json response into TranscriptSegment[].
 */
export function parseGroqWhisperSegments(groqResponse: {
  segments?: { text: string; start: number; end: number }[];
  text?: string;
}): TranscriptSegment[] {
  if (groqResponse.segments?.length) {
    return groqResponse.segments.map((s) => ({
      text: s.text,
      start: s.start,
      end: s.end,
    }));
  }
  return [];
}
