import { hasDatabase, payloadClient } from "@/lib/cms";

/**
 * Uptime check (M6). Reports whether the app and database respond, without
 * revealing configuration or secrets. Point an uptime monitor at /api/health.
 */
export async function GET() {
  const started = Date.now();
  let database: "up" | "down" | "not-configured" = "not-configured";
  if (hasDatabase()) {
    try {
      const payload = await payloadClient();
      await payload.count({ collection: "users", overrideAccess: true });
      database = "up";
    } catch {
      database = "down";
    }
  }
  const ok = database !== "down";
  return Response.json(
    { ok, database, ms: Date.now() - started },
    { status: ok ? 200 : 503, headers: { "cache-control": "no-store" } },
  );
}
