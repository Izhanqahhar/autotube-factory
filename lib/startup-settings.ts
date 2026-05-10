/**
 * Load persisted AppSettings from DB into process.env on server startup.
 * Called from instrumentation.ts so it runs once before any request handler.
 */
import { prisma } from "@/lib/prisma";

let loaded = false;

export async function loadSettingsIntoEnv(): Promise<void> {
  if (loaded) return;
  loaded = true;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await (prisma as any).appSettings.findMany();
    let count = 0;
    for (const row of rows as { key: string; value: string }[]) {
      if (row.value && !process.env[row.key]) {
        // Only set if not already set (env file takes priority)
        process.env[row.key] = row.value;
        count++;
      }
    }
    if (count > 0) {
      console.log(`[startup-settings] Loaded ${count} API key(s) from DB into process.env`);
    }
  } catch (e) {
    // Don't crash on startup if DB not ready yet
    console.warn("[startup-settings] Could not load settings:", String(e));
  }
}
