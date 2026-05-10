/**
 * GET  /api/services/status  — ping all local services, return online/offline
 * POST /api/services/status  — save enabled/port overrides to DB
 */

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export interface ServiceDef {
  id: string;
  name: string;
  icon: string;
  category: string;
  description: string;
  defaultPort: number;
  healthPath: string;          // path to GET for health check
  envPortKey?: string;         // env var that overrides port
}

export const LOCAL_SERVICES: ServiceDef[] = [
  // ── LLM servers ─────────────────────────────────────────────────────────────
  { id: "ollama",     name: "Ollama",          icon: "🏠", category: "LLM",   defaultPort: 11434, healthPath: "/api/tags",         description: "Local LLM runner — Llama, Mistral, Phi, Hermes…",       envPortKey: "OLLAMA_PORT" },
  { id: "lmstudio",  name: "LM Studio",        icon: "🧪", category: "LLM",   defaultPort: 1234,  healthPath: "/v1/models",        description: "OpenAI-compatible local LLM server",                     envPortKey: "LMSTUDIO_PORT" },
  // ── TTS servers ──────────────────────────────────────────────────────────────
  { id: "kokoro",    name: "Kokoro TTS",        icon: "🎵", category: "TTS",   defaultPort: 8880,  healthPath: "/v1/models",        description: "Best free TTS — OpenAI-compatible API",                  envPortKey: "KOKORO_PORT" },
  { id: "alltalk",   name: "AllTalk TTS",        icon: "🗣️", category: "TTS",   defaultPort: 7851,  healthPath: "/api/ready",        description: "Local TTS server with many voice models",                envPortKey: "ALLTALK_PORT" },
  { id: "fish",      name: "Fish Speech",        icon: "🐟", category: "TTS",   defaultPort: 8080,  healthPath: "/v1/models",        description: "High quality cloneable TTS",                             envPortKey: "FISH_SPEECH_PORT" },
  // ── Image servers ────────────────────────────────────────────────────────────
  { id: "comfyui",   name: "ComfyUI",            icon: "🎨", category: "Image", defaultPort: 8188,  healthPath: "/system_stats",     description: "Local AI image generation (Stable Diffusion)",          envPortKey: "COMFYUI_PORT" },
  // ── Video / other ────────────────────────────────────────────────────────────
  { id: "openwebui", name: "Open WebUI",          icon: "🌐", category: "Other", defaultPort: 3002,  healthPath: "/health",           description: "ChatGPT-like UI for Ollama & Hermes — localhost:3002",  envPortKey: "OPEN_WEBUI_PORT" },
];

async function pingService(svc: ServiceDef, port: number): Promise<{ online: boolean; latencyMs?: number }> {
  const host = process.env.NODE_ENV === "production"
    ? "host.docker.internal"   // inside Docker container
    : "localhost";             // local dev
  const url = `http://${host}:${port}${svc.healthPath}`;
  const start = Date.now();
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(2500), cache: "no-store" });
    return { online: res.ok || res.status < 500, latencyMs: Date.now() - start };
  } catch {
    return { online: false };
  }
}

function getPort(svc: ServiceDef): number {
  const envKey = svc.envPortKey;
  if (envKey && process.env[envKey]) return Number(process.env[envKey]);
  return svc.defaultPort;
}

export async function GET() {
  // Load enabled/port overrides from DB
  const settings = await prisma.appSettings.findMany({
    where: { key: { startsWith: "service." } },
  });
  const settingsMap: Record<string, string> = {};
  for (const s of settings) settingsMap[s.key] = s.value;

  const results = await Promise.all(
    LOCAL_SERVICES.map(async (svc) => {
      const enabledKey = `service.${svc.id}.enabled`;
      const portKey = `service.${svc.id}.port`;
      const enabled = settingsMap[enabledKey] !== "false"; // default enabled
      const port = settingsMap[portKey] ? Number(settingsMap[portKey]) : getPort(svc);

      const { online, latencyMs } = enabled
        ? await pingService(svc, port)
        : { online: false, latencyMs: undefined };

      return {
        ...svc,
        enabled,
        port,
        online,
        latencyMs,
      };
    })
  );

  return NextResponse.json(results);
}

export async function POST(req: NextRequest) {
  try {
    const { id, enabled, port } = await req.json() as { id: string; enabled?: boolean; port?: number };
    const updates: Promise<unknown>[] = [];

    if (enabled !== undefined) {
      updates.push(prisma.appSettings.upsert({
        where: { key: `service.${id}.enabled` },
        create: { key: `service.${id}.enabled`, value: String(enabled) },
        update: { value: String(enabled) },
      }));
    }
    if (port !== undefined) {
      updates.push(prisma.appSettings.upsert({
        where: { key: `service.${id}.port` },
        create: { key: `service.${id}.port`, value: String(port) },
        update: { value: String(port) },
      }));
    }

    await Promise.all(updates);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
