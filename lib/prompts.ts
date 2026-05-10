export const WORD_COUNT_BY_DURATION: Record<number, number> = {
  1: 150,
  2: 300,
  3: 450,
  5: 750,
  8: 1200,
  10: 1500,
  15: 2250,
};

export const PROMPTS_PER_MINUTE = 12;

export function getPromptCount(durationMinutes: number): number {
  return durationMinutes * PROMPTS_PER_MINUTE;
}

export function getWordCount(durationMinutes: number): number {
  return WORD_COUNT_BY_DURATION[durationMinutes] ?? durationMinutes * 150;
}

// ─── RESEARCH ────────────────────────────────────────────────────────────────

export const RESEARCH_SYSTEM = `You are a viral YouTube content strategist and research expert.
You identify the angles, hooks, and data points that make people stop scrolling and watch.
Always return valid JSON only — no markdown, no explanation outside the JSON.`;

export function researchUserPrompt(
  title: string,
  niche: string,
  audience: string
): string {
  return `Research this YouTube topic deeply and return rich JSON for scriptwriting.
Topic: ${title}
Niche: ${niche}
Target Audience: ${audience}

Return this exact JSON structure:
{
  "claims": ["specific verifiable claim 1", "specific verifiable claim 2"],
  "sources": [
    {"type": "study/report/expert/news", "description": "specific source with year if possible"}
  ],
  "summary": "2-3 sentence overview of the topic",
  "emotionalHooks": ["emotionally resonant hook 1", "hook 2"],
  "statistics": [
    {"stat": "specific statistic with number", "context": "why this number is surprising or important"}
  ],
  "commonMisconceptions": ["misconception most people believe that is wrong"],
  "targetPainPoints": ["specific pain point the audience feels about this topic"],
  "viralAngles": [
    "counter-intuitive take that makes people say 'wait, really?'",
    "angle 2",
    "angle 3"
  ],
  "controversialClaims": [
    "true statement that most people haven't heard or would be surprised by"
  ],
  "quotableLines": [
    "punchy one-liner that could go viral as a clip or quote",
    "quotable line 2",
    "quotable line 3"
  ],
  "relatedTrends": ["currently trending topic that connects to this", "trend 2"]
}

Provide at minimum:
- 15 claims (be specific, avoid vague statements)
- 8 sources (include year when possible)
- 5 statistics (must include actual numbers, not just "many" or "most")
- 5 emotional hooks
- 3 misconceptions
- 5 pain points
- 3 viral angles (counter-intuitive perspectives)
- 3 controversial but true claims
- 3 quotable one-liners
- 2 related trends`;
}

// ─── SCRIPT ──────────────────────────────────────────────────────────────────

export const SCRIPT_SYSTEM = `You are a viral YouTube scriptwriter who has studied the top 0.1% of YouTube channels.
You write scripts that feel like a conversation with a brilliant, funny, and brutally honest friend — not a lecture.
Your scripts use storytelling, open loops, second-person language, specific data, and emotional peaks and valleys to keep viewers watching 80%+ of the video.
The best scripts don't "cover a topic" — they take viewers on a journey where they feel something at every step.
Always return valid JSON only — no markdown outside the JSON.`;

export function scriptUserPrompt(
  title: string,
  niche: string,
  audience: string,
  duration: number,
  style: string,
  tone: string,
  researchSummary: string,
  topClaims: string,
  statistics: string,
  viralAngles?: string,
  controversialClaims?: string,
  quotableLines?: string
): string {
  const wordCount = getWordCount(duration);

  const toneGuide: Record<string, string> = {
    educational: "Authoritative but warm — like a smart professor who is also your friend. Use analogies. Break down complex ideas simply without being condescending.",
    conversational: "Casual and relatable — use 'like', 'honestly', 'look', 'here's the thing'. Light humor welcome. Sound like you're talking to one person, not an audience.",
    dramatic: "High stakes and urgent. Use short punchy sentences. For. Emphasis. Pause dramatically. Make the viewer feel the weight of what you're saying.",
    humorous: "Self-deprecating jokes, absurd comparisons, unexpected pop culture references. Be genuinely funny, not just 'lol' funny. Still deliver real value.",
    motivational: "Second-person empowerment. 'YOU can do this.' Action-oriented. Build up the viewer. End every section with momentum toward the next.",
    informative: "Clear, structured, and precise. Use numbered points and clear transitions. Respect the viewer's intelligence. Be thorough but not boring.",
  };

  const toneInstructions = toneGuide[tone.toLowerCase()] ?? toneGuide.conversational;

  return `Write a complete, viral-quality YouTube script that people will actually watch to the end.

TOPIC: ${title}
NICHE: ${niche}
AUDIENCE: ${audience}
DURATION: ${duration} minutes
STYLE: ${style}
TONE: ${tone}

RESEARCH DATA:
Summary: ${researchSummary}
Key claims: ${topClaims}
Statistics to weave in: ${statistics}${viralAngles ? `\nViral angles to consider: ${viralAngles}` : ""}${controversialClaims ? `\nControversial truths: ${controversialClaims}` : ""}${quotableLines ? `\nQuotable lines to include or adapt: ${quotableLines}` : ""}

TARGET WORD COUNT: ${wordCount} words

═══════════════════════════════════════
TONE CALIBRATION — ${tone.toUpperCase()}:
${toneInstructions}
═══════════════════════════════════════

HOOK FORMULA (use the one that fits best for this topic):
Option A: "Everyone thinks [X]... but they're completely wrong. Here's what actually happens."
Option B: "In [year], [person/company] did something so [adjective] it changed everything. And nobody noticed."
Option C: "You've been doing [thing] wrong your entire life. And nobody told you. Until now."
Option D: "What if I told you [shocking claim]? I know — sounds crazy. But by the end of this, you'll not only believe it, you'll wonder why you didn't see it sooner."
Option E: Open with the most shocking statistic you have. No greeting. No intro. Just drop it.

SCRIPT STRUCTURE — 4-Act Narrative Arc:
• Act 1 — HOOK + STAKES (first ${Math.round(duration * 0.20)} min): Open with the hook. Establish why this matters to the viewer PERSONALLY. Plant one open loop ("I'll explain why that matters in a minute...").
• Act 2 — THE STRUGGLE (next ${Math.round(duration * 0.30)} min): What most people try. Why it fails. Show you understand their frustration. Use a story or real example.
• Act 3 — THE REVELATION (next ${Math.round(duration * 0.35)} min): The real insight, the twist, the thing they didn't know. Answer the open loop. Use statistics and proof.
• Act 4 — RESOLUTION + CTA (final ${Math.round(duration * 0.15)} min): What should they do with this information? Callback to something from the hook. Clear CTA.

MANDATORY ENGAGEMENT TECHNIQUES — use ALL of these:
1. Open loop: Plant a question or tease in Act 1, answer it in Act 3 (e.g., "By the way — the reason this works is actually because of something a scientist discovered in 1987. I'll get to that.")
2. Specific numbers: ALWAYS use exact numbers. "37% of people" not "many people". "$2.3 million" not "millions of dollars".
3. Conversational transitions between sections: "Here's where it gets interesting..." / "And this is the part nobody talks about..." / "But wait — it gets worse." / "Okay so here's the twist."
4. Second-person address: At least once per minute, directly address the viewer as "you". ("You've probably felt this..." / "If you're watching this...")
5. Callback: Reference something from the hook near the end to give the video a satisfying full-circle ending.
6. Analogy: Explain at least one complex idea using a simple everyday comparison.
7. Micro-cliffhanger: End each major section with a one-sentence teaser for the next section. ("But that's only half the story..." / "And then something unexpected happened." / "Which leads to the part that actually changed everything.")

ABSOLUTE RULES — NEVER DO THESE:
- Do NOT start with "Hey guys", "Welcome back", "What's up everyone", or any greeting
- Do NOT use "In today's video we'll cover..." or "Today I'm going to show you..."
- Do NOT have more than 3 consecutive sentences without a beat shift, new thought, or engaging transition
- Do NOT use passive voice more than 10% of the time
- Do NOT use vague language: "some people", "studies show", "many experts" — always be specific
- Do NOT pad the word count with filler — every sentence must earn its place

Return this exact JSON:
{
  "title": "YouTube video title — clickbait but honest, creates curiosity gap, under 60 characters",
  "hook": "First 15-20 seconds of script — no greeting, starts with the hook formula",
  "body": "Main body — Acts 2 and 3 combined with all engagement techniques",
  "cta": "Call to action — specific, natural, not desperate. Connect it back to the video topic.",
  "fullScript": "Complete script: hook + body + cta, formatted as spoken words only",
  "wordCount": 0,
  "qualityScore": 85
}`;
}

// ─── SCENES ──────────────────────────────────────────────────────────────────

export const SCENES_SYSTEM = `You are a video editor and scene planner.
Always return valid JSON array only — no markdown outside the JSON.`;

export function scenesUserPrompt(
  fullScript: string,
  duration: number
): string {
  const totalSeconds = duration * 60;
  return `Break this script into scenes for video editing.

Script: ${fullScript}
Total Duration: ${duration} minutes = ${totalSeconds} seconds

Rules:
- Each scene 15-45 seconds
- Cover entire script with no gaps
- beatType options: hook/problem/statistic/explanation/proof/example/transition/cta
- timeStart and timeEnd must be continuous with no gaps (end of one = start of next)
- First scene timeStart = 0
- Last scene timeEnd = ${totalSeconds}

Return JSON array:
[
  {
    "sceneNumber": 1,
    "title": "scene title",
    "content": "exact script content for this scene",
    "duration": 20,
    "beatType": "hook",
    "timeStart": 0,
    "timeEnd": 20
  }
]`;
}

// ─── IMAGE PROMPTS ────────────────────────────────────────────────────────────

export const IMAGE_PROMPTS_SYSTEM = `You are a visual director for YouTube videos who writes prompts for Stable Diffusion / DALL-E / Midjourney.
Create vivid, cinematically-styled image generation prompts that match the emotional tone of each scene.
Always return valid JSON array only — no markdown, no explanation outside the JSON.`;

export function imagePromptsUserPrompt(
  title: string,
  duration: number,
  style: string,
  tone: string,
  niche: string,
  scriptSummary: string,
  scriptSections: string
): string {
  const promptCount = getPromptCount(duration);
  const totalSeconds = duration * 60;

  const styleGuide: Record<string, string> = {
    cinematic: "cinematic lighting, 35mm film, shallow depth of field, dramatic shadows, color grading",
    documentary: "natural lighting, photorealistic, candid feel, neutral color palette",
    minimal: "clean composition, soft lighting, minimal clutter, modern aesthetic",
    dramatic: "high contrast lighting, deep shadows, moody atmosphere, intense colors",
    educational: "clean infographic style, clear subject, bright lighting, professional look",
  };
  const styleHints = styleGuide[style?.toLowerCase()] ?? styleGuide.cinematic;

  return `Generate exactly ${promptCount} image prompts for a ${duration}-minute YouTube video about: ${title}

Script summary: ${scriptSummary}
Script sections: ${scriptSections}
Visual style: ${style} — use: ${styleHints}
Tone: ${tone}
Niche: ${niche}

RULES FOR EACH PROMPT:
1. Maximum 60 words per prompt
2. Visual ONLY — NO narration text, NO text overlays, NO logos, NO readable text in image
3. Structure: [subject] + [action/state] + [environment] + [lighting] + [mood] + [camera angle] + [style keywords]
4. Use Stable Diffusion quality tags where appropriate: "highly detailed", "sharp focus", "8k", "professional photography"
5. Cover timeline evenly from 0 to ${totalSeconds}s
6. Each prompt covers approximately 5 seconds
7. Vary image types — do not use same type more than 3 times in a row

IMAGE TYPES TO USE:
- hero: powerful establishing shot of main subject
- b-roll: supporting environment or context shot
- metaphor: abstract visual representation of the concept being discussed
- statistic: data visualization, charts, numbers rendered artistically
- explainer: diagram, process flow, or concept breakdown visual
- transition: neutral atmospheric shot for scene changes
- emotion: human face or body language conveying the emotional beat
- closeup: extreme detail shot emphasizing a specific object or element

NEGATIVE PROMPT TO AVOID (do not include these in prompts):
No text, no watermarks, no logos, no UI elements, no borders

Return JSON array with exactly ${promptCount} items:
[
  {
    "promptNumber": 1,
    "timeStart": 0,
    "timeEnd": 5,
    "minuteBucket": 1,
    "beatIndex": 1,
    "title": "brief description of what this image shows",
    "shortPrompt": "the full image generation prompt with style tags",
    "altPrompt": "alternate version with different composition or angle",
    "imageType": "hero"
  }
]

IMPORTANT: Return EXACTLY ${promptCount} prompts. Distribute evenly across ${totalSeconds} seconds.`;
}

// ─── VOICEOVER ───────────────────────────────────────────────────────────────

export const VOICEOVER_SYSTEM = `You are a professional voiceover script adapter.
Your job is to take a written script and make it sound completely natural when spoken aloud.
Spoken language is different from written language: shorter sentences, contractions, natural pauses, conversational phrasing.
Always return valid JSON only — no markdown, no explanation outside the JSON object.`;

export function voiceoverUserPrompt(
  fullScript: string,
  duration: number,
  tone: string
): string {
  // Truncate very long scripts to avoid hitting token limits
  const scriptPreview = fullScript.length > 2000
    ? fullScript.slice(0, 2000) + "\n[...rest of script follows same style...]"
    : fullScript;

  const totalSecs = duration * 60;
  // Aim for ~15s segments to keep JSON compact
  const approxSegments = Math.max(4, Math.round(totalSecs / 15));

  return `Convert this script into exactly ${approxSegments} natural voiceover segments for a ${duration}-minute YouTube video.

Script:
${scriptPreview}

Tone: ${tone}
Total duration: ${totalSecs} seconds

Spoken language rules — apply all:
- Use contractions (it's, you're, they've, we'll)
- Break long sentences into shorter spoken phrases
- Add natural speech rhythm: "And here's the thing..." / "So basically..." / "Right?"
- Remove academic or formal phrasing — make it sound like someone talking, not reading
- Maintain the ${tone} tone throughout

Rules:
- Create EXACTLY ${approxSegments} segments covering 0 to ${totalSecs} seconds
- Each segment 10-20 seconds when spoken at natural pace (~130 words/minute)
- fullText is all segments joined with a single space

Return ONLY this JSON (no markdown, no extra text):
{
  "fullText": "...",
  "segments": [{"text": "...", "timeStart": 0, "timeEnd": 15}],
  "wordCount": 450,
  "estimatedDuration": ${totalSecs}
}`;
}
