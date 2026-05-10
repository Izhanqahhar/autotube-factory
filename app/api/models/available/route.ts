import { NextResponse } from "next/server";
import { ALL_FREE_MODELS, PROVIDER_LABELS } from "@/lib/models";

// GET /api/models/available — all models with live status
export async function GET() {
  // Get provider status
  const statusRes = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001"}/api/models/status`,
    { signal: AbortSignal.timeout(5000) }
  ).then((r) => r.json()).catch(() => ({}));

  // Augment models with availability
  const models = ALL_FREE_MODELS.map((m) => {
    const ps = statusRes[m.provider];
    const providerAvailable = ps?.available ?? false;

    // For Ollama — check if specific model is installed
    let modelInstalled = providerAvailable;
    if (m.provider === "ollama" && ps?.models) {
      const localName = m.id.replace("ollama/", "");
      modelInstalled = ps.models.some((installed: string) =>
        installed === localName || installed.startsWith(localName.split(":")[0])
      );
    }

    return {
      ...m,
      available: modelInstalled,
      providerAvailable,
      providerLabel: PROVIDER_LABELS[m.provider]?.name ?? m.provider,
      providerIcon: PROVIDER_LABELS[m.provider]?.icon ?? "🤖",
    };
  });

  // Group by provider
  const grouped = Object.keys(PROVIDER_LABELS).map((provider) => ({
    provider,
    ...PROVIDER_LABELS[provider],
    available: statusRes[provider]?.available ?? false,
    reason: statusRes[provider]?.reason,
    installedModels: statusRes[provider]?.models ?? [],
    models: models.filter((m) => m.provider === provider),
  }));

  return NextResponse.json({ models, grouped, status: statusRes });
}
