// Next.js instrumentation hook — runs once on server startup
// https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Load persisted API keys from DB into process.env before anything else
    const { loadSettingsIntoEnv } = await import("@/lib/startup-settings");
    await loadSettingsIntoEnv();

    const { startScheduler } = await import("@/lib/scheduler");
    await startScheduler();
  }
}
