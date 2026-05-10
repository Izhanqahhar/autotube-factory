import { NextResponse } from "next/server";

// GET /api/models/status — live-test all providers
export async function GET() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: Record<string, any> = {};

  // ── AWS Bedrock ──────────────────────────────────────────────────────────
  r.bedrock = (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY)
    ? { available: true }
    : { available: false, reason: "AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY not set" };

  // ── Ollama (live) ────────────────────────────────────────────────────────
  try {
    const url = process.env.OLLAMA_URL ?? "http://localhost:11434";
    const res = await fetch(`${url}/api/tags`, { signal: AbortSignal.timeout(2000) });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
      r.ollama = { available: true, models };
    } else {
      r.ollama = { available: false, reason: `HTTP ${res.status}` };
    }
  } catch {
    r.ollama = { available: false, reason: "Not running at " + (process.env.OLLAMA_URL ?? "http://localhost:11434") };
  }

  // ── LM Studio (live) ─────────────────────────────────────────────────────
  try {
    const url = process.env.LMSTUDIO_URL ?? process.env.LM_STUDIO_URL ?? "http://localhost:1234";
    const res = await fetch(`${url}/v1/models`, { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      const data = await res.json();
      const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
      r.lmstudio = { available: true, models };
    } else {
      r.lmstudio = { available: false, reason: `HTTP ${res.status}` };
    }
  } catch {
    r.lmstudio = { available: false, reason: "LM Studio not running at " + (process.env.LMSTUDIO_URL ?? "http://localhost:1234") };
  }

  // ── Groq (live API test) ─────────────────────────────────────────────────
  if (!process.env.GROQ_API_KEY) {
    r.groq = { available: false, reason: "GROQ_API_KEY not set — free at console.groq.com" };
  } else {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.data ?? []).map((m: { id: string }) => m.id);
        r.groq = { available: true, models };
      } else {
        const err = await res.json().catch(() => ({}));
        r.groq = { available: false, reason: `HTTP ${res.status}: ${(err as any)?.error?.message ?? "unknown"}` };
      }
    } catch (e) {
      r.groq = { available: false, reason: String(e) };
    }
  }

  // ── Google AI (live API test) ─────────────────────────────────────────────
  if (!process.env.GOOGLE_AI_KEY) {
    r.google = { available: false, reason: "GOOGLE_AI_KEY not set — free at aistudio.google.com" };
  } else {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GOOGLE_AI_KEY}`,
        { signal: AbortSignal.timeout(5000) }
      );
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name.replace("models/", ""));
        r.google = { available: true, models };
      } else {
        const err = await res.json().catch(() => ({}));
        r.google = { available: false, reason: `HTTP ${res.status}: ${(err as any)?.error?.message ?? "unknown"}` };
      }
    } catch (e) {
      r.google = { available: false, reason: String(e) };
    }
  }

  // ── OpenRouter (live API test) ────────────────────────────────────────────
  if (!process.env.OPENROUTER_API_KEY) {
    r.openrouter = { available: false, reason: "OPENROUTER_API_KEY not set — free at openrouter.ai" };
  } else {
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models", {
        headers: { Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        const models: string[] = (data.data ?? []).slice(0, 20).map((m: { id: string }) => m.id);
        r.openrouter = { available: true, modelCount: (data.data ?? []).length, sampleModels: models };
      } else {
        r.openrouter = { available: false, reason: `HTTP ${res.status}` };
      }
    } catch (e) {
      r.openrouter = { available: false, reason: String(e) };
    }
  }

  // ── HuggingFace (live API test) ──────────────────────────────────────────
  if (!process.env.HUGGINGFACE_API_KEY) {
    r.huggingface = { available: false, reason: "HUGGINGFACE_API_KEY not set — free at huggingface.co" };
  } else {
    try {
      const res = await fetch("https://huggingface.co/api/whoami", {
        headers: { Authorization: `Bearer ${process.env.HUGGINGFACE_API_KEY}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const data = await res.json();
        r.huggingface = { available: true, user: (data as any).name };
      } else {
        r.huggingface = { available: false, reason: `HTTP ${res.status} — invalid key?` };
      }
    } catch (e) {
      r.huggingface = { available: false, reason: String(e) };
    }
  }

  // ── Cloudflare AI (live API test) ────────────────────────────────────────
  const cfToken = process.env.CLOUDFLARE_API_TOKEN ?? process.env.CLOUDFLARE_AI_KEY;
  const cfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!cfToken || !cfAccount) {
    r.cloudflare = { available: false, reason: "CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN not set — free at cloudflare.com" };
  } else {
    try {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${cfAccount}/ai/models/search`,
        {
          headers: { Authorization: `Bearer ${cfToken}` },
          signal: AbortSignal.timeout(5000),
        }
      );
      if (res.ok) {
        const data = await res.json();
        r.cloudflare = { available: true, modelCount: (data.result ?? []).length };
      } else {
        r.cloudflare = { available: false, reason: `HTTP ${res.status}` };
      }
    } catch (e) {
      r.cloudflare = { available: false, reason: String(e) };
    }
  }

  // ── Pollinations (no key needed) ─────────────────────────────────────────
  r.pollinations = { available: true, reason: "No API key needed — always free" };

  return NextResponse.json(r);
}
