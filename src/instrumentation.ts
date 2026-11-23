import type { Instrumentation } from "next";

/**
 * Server error reporting (M6). Writes one structured JSON line per error,
 * which Vercel's runtime logs capture and can forward to a log drain or
 * Sentry later. Query strings are stripped because confirmation and receipt
 * URLs carry secret tokens.
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const e = err as { message?: string; digest?: string; name?: string };
  console.error(
    JSON.stringify({
      level: "error",
      source: "next",
      time: new Date().toISOString(),
      name: e?.name,
      message: e?.message ?? String(err),
      digest: e?.digest,
      method: request.method,
      path: request.path.split("?")[0],
      routePath: context.routePath,
      routeType: context.routeType,
      renderSource: (context as { renderSource?: string }).renderSource,
    }),
  );
};
