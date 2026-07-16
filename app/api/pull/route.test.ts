/**
 * Integration-shaped tests for the /api/pull Route Handler (task 7.2).
 *
 * Feature: gacha-idea-generator
 * Validates: Requirements 1.1, 1.2, 5.5
 *
 * ---------------------------------------------------------------------------
 * Honest scope note (read before trusting this file as "integration
 * coverage"):
 *
 * This workspace has no linked Supabase project and no running Postgres
 * instance (no CLI, no local database) -- the same constraint noted in
 * tasks 6.1-6.7's test files. A true integration test that exercises real
 * Supabase Auth, real RLS policies, and a real `record_pull` transaction is
 * not feasible here.
 *
 * What THIS file verifies (at the HTTP-handler level, `lib/pull/service`
 * mocked out):
 *   - Requirement 1.1/1.2: an unauthenticated `performPull` result is
 *     translated by the Route Handler into a 401 response with
 *     `{ error: "unauthenticated" }`.
 *   - Requirement 5.5: the JSON response body for both the success path and
 *     every error path never contains the raw `Drop_Rate_Config` object (no
 *     `common`/`rare`/`super_rare` probability fields, no `probability` /
 *     `drop_rate_config` keys) and never contains anything resembling a
 *     service-role key or secret (no `service_role`, `SUPABASE_SERVICE_ROLE`,
 *     `apikey`, or `key` fields at all).
 *
 * What this file does NOT verify (would require a live Supabase project):
 *   - That Supabase Auth itself rejects an invalid/missing session cookie
 *     (here, "unauthenticated" is simply whatever `performPull` -- mocked --
 *     returns).
 *   - That RLS policies on `pull_history` / `user_pity_state` actually
 *     prevent one user's Postgres session from reading/writing another
 *     user's rows.
 *   - That the service-role key is not present in the deployed environment.
 *
 * Requirements 1.2/1.3/1.4 (per-user association, cross-device load, and RLS
 * isolation) are instead exercised one level down, directly against
 * `performPull`, in `lib/pull/service-auth-rls.test.ts` -- see that file's
 * header comment for its own scope notes.
 * ---------------------------------------------------------------------------
 */

import { afterEach, describe, expect, it, vi } from "vitest";

// route.ts (and, transitively, several lib/pull/service.ts imports) begin
// with `import "server-only"`, which throws outside of Next.js's
// react-server module graph. Vitest runs in a plain Node environment, so
// this marker import is stubbed out here purely to make the module loadable
// under test -- it has no bearing on the behavior under test.
vi.mock("server-only", () => ({}));

const { performPullMock } = vi.hoisted(() => ({
  performPullMock: vi.fn(),
}));

vi.mock("../../../lib/pull/service", () => ({
  performPull: performPullMock,
}));

import { POST } from "./route";

function makeRequest(bodyObj: unknown): Request {
  return new Request("http://localhost/api/pull", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(bodyObj),
  });
}

/**
 * Recursively collects every string key found anywhere in a JSON-shaped
 * value, so we can assert none of them look like config internals or
 * secrets regardless of nesting.
 */
function collectKeys(value: unknown, acc: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) collectKeys(item, acc);
  } else if (value !== null && typeof value === "object") {
    for (const [key, val] of Object.entries(value)) {
      acc.push(key);
      collectKeys(val, acc);
    }
  }
  return acc;
}

const FORBIDDEN_KEY_PATTERNS = [
  /probability/i,
  /drop_rate/i,
  /dropRate/i,
  /service_role/i,
  /serviceRole/i,
  /service-role/i,
  /apikey/i,
  /api_key/i,
  /secret/i,
  /^key$/i,
];

function assertNoConfigOrSecretLeak(body: unknown): void {
  const json = JSON.stringify(body);
  // Belt-and-suspenders: the raw default config percentages (79/18/3) should
  // never appear together with tier names in the payload shape.
  expect(json).not.toMatch(/"common"\s*:\s*79/);
  expect(json).not.toMatch(/"rare"\s*:\s*18/);
  expect(json).not.toMatch(/"super_rare"\s*:\s*3\b/);

  const keys = collectKeys(body);
  for (const key of keys) {
    for (const pattern of FORBIDDEN_KEY_PATTERNS) {
      expect(
        pattern.test(key),
        `response key "${key}" matches forbidden pattern ${pattern}`,
      ).toBe(false);
    }
  }
}

describe("/api/pull Route Handler - auth and non-exposure (task 7.2)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    "Requirements 1.1, 1.2: returns 401 { error: \"unauthenticated\" } when " +
      "performPull reports no authenticated user, and never reaches persistence",
    async () => {
      performPullMock.mockResolvedValue({
        ok: false,
        error: "unauthenticated",
      });

      const response = await POST(makeRequest({ mode: "single" }));
      const body = await response.json();

      expect(response.status).toBe(401);
      expect(body).toEqual({ error: "unauthenticated" });
      expect(performPullMock).toHaveBeenCalledWith("single");
    },
  );

  it(
    "Requirement 5.5: a successful pull response contains only awarded " +
      "results and pity, never Drop_Rate_Config internals or a service-role key",
    async () => {
      performPullMock.mockResolvedValue({
        ok: true,
        items: [
          {
            ideaId: "22222222-2222-2222-2222-222222222222",
            title: "Test Idea",
            description: "A test idea",
            tier: "common",
          },
        ],
        pityAfter: 4,
      });

      const response = await POST(makeRequest({ mode: "single" }));
      const body = await response.json();

      expect(response.status).toBe(200);
      expect(body).toEqual({
        items: [
          {
            ideaId: "22222222-2222-2222-2222-222222222222",
            title: "Test Idea",
            description: "A test idea",
            tier: "common",
          },
        ],
        pityAfter: 4,
      });
      assertNoConfigOrSecretLeak(body);
    },
  );

  it.each([
    ["config-error", 500],
    ["catalog-error", 500],
    ["internal", 500],
  ] as const)(
    'Requirement 5.5: the "%s" error response never exposes config internals or a service-role key',
    async (errorCode, expectedStatus) => {
      performPullMock.mockResolvedValue({ ok: false, error: errorCode });

      const response = await POST(makeRequest({ mode: "batch" }));
      const body = await response.json();

      expect(response.status).toBe(expectedStatus);
      expect(body).toEqual({ error: errorCode });
      assertNoConfigOrSecretLeak(body);
    },
  );

  it("returns 401 body without leaking config/secret-shaped keys either", async () => {
    performPullMock.mockResolvedValue({ ok: false, error: "unauthenticated" });

    const response = await POST(makeRequest({ mode: "single" }));
    const body = await response.json();

    assertNoConfigOrSecretLeak(body);
  });
});
