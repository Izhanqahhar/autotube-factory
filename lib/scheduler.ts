import cron from "node-cron";
import { fetchAllActiveFeeds, seedDefaultFeeds } from "@/lib/rss-fetcher";
import { prisma } from "@/lib/prisma";

const db = prisma as any; // eslint-disable-line @typescript-eslint/no-explicit-any

let schedulerStarted = false;

export async function startScheduler() {
  if (schedulerStarted) return;
  schedulerStarted = true;

  const intervalHours = Number(process.env.RSS_FETCH_INTERVAL_HOURS ?? "6");
  const autoFetch = process.env.ENABLE_AUTO_FETCH === "true";

  // Seed default feeds on first startup if no feeds exist
  try {
    const feedCount = await db.rssFeed.count();
    if (feedCount === 0) {
      console.log("[Scheduler] No feeds found — seeding defaults...");
      await seedDefaultFeeds();
      console.log("[Scheduler] Default feeds seeded.");
    }
  } catch (err) {
    console.error("[Scheduler] Seed error:", err);
  }

  if (!autoFetch) {
    console.log(`[Scheduler] Auto-fetch disabled. Set ENABLE_AUTO_FETCH=true to enable.`);
    return;
  }

  // Convert hours to cron expression
  // Every N hours — simplified: every hour for 1h, every 6h for 6h, etc.
  const cronExpr = intervalHours <= 1
    ? "0 * * * *"       // every hour
    : intervalHours <= 6
    ? "0 */6 * * *"     // every 6 hours
    : intervalHours <= 12
    ? "0 */12 * * *"    // every 12 hours
    : "0 0 * * *";      // once daily

  cron.schedule(cronExpr, async () => {
    console.log(`[Scheduler] Running scheduled RSS fetch...`);
    try {
      const result = await fetchAllActiveFeeds();
      console.log(`[Scheduler] Fetched ${result.total} new items (${result.errors} errors)`);
    } catch (err) {
      console.error("[Scheduler] RSS fetch failed:", err);
    }
  });

  console.log(`[Scheduler] RSS auto-fetch scheduled: ${cronExpr} (every ~${intervalHours}h)`);
}
