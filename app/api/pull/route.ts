import "server-only";

import { performPull } from "../../../lib/pull/service";
import type { PullMode } from "../../../lib/pull/types";

/**
 * Pull_Service Route Handler.
 *
 * Reads `{ mode }` from the request body, delegates authentication, drop
 * rate / pity logic, catalog-backed idea selection, and atomic persistence
 * to `performPull` (lib/pull/service.ts), and maps its `PullServiceResult`
 * to an HTTP response. Never leaks `Drop_Rate_Config` internals or the
 * Supabase service-role key — only awarded results and pity are returned.
 *
 * See design.md > "Error Handling" for the response contract.
 *
 * Requirements: 1.1, 1.2, 5.1, 5.5, 8.2, 8.3
 */

function isPullMode(value: unknown): value is PullMode {
  return value === "single" || value === "batch";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  const mode = (body as { mode?: unknown } | null)?.mode;
  if (!isPullMode(mode)) {
    return Response.json({ error: "invalid-request" }, { status: 400 });
  }

  const result = await performPull(mode);

  if (result.ok) {
    return Response.json(
      { items: result.items, pityAfter: result.pityAfter },
      { status: 200 },
    );
  }

  switch (result.error) {
    case "unauthenticated":
      return Response.json({ error: "unauthenticated" }, { status: 401 });
    case "config-error":
      // The server's Drop_Rate_Config is missing or invalid (probabilities
      // don't sum to 100). This is a server-side misconfiguration the
      // client cannot fix by retrying with different input, so 500 (rather
      // than 503, which would imply a transient upstream outage) is the
      // more accurate status.
      return Response.json({ error: "config-error" }, { status: 500 });
    case "catalog-error":
      return Response.json({ error: "catalog-error" }, { status: 500 });
    case "internal":
      return Response.json({ error: "internal" }, { status: 500 });
    default:
      return Response.json({ error: "internal" }, { status: 500 });
  }
}
