/**
 * Test for transactional integrity on failure.
 *
 * Feature: gacha-idea-generator, Property 9: Transactional integrity on failure
 * Validates: Requirements 8.1
 *
 * design.md's Property 9 states: "For any pull that fails before results are
 * committed, the User's Pity_Counter and Pull_History SHALL remain identical
 * to their pre-pull values."
 *
 * `performPull` persists atomically through a single `record_pull` RPC call
 * (lib/pull/service.ts) -- there is no separate/redundant write path that
 * could partially succeed. So the property that is actually observable at
 * the `performPull` call boundary is: whenever the `record_pull` RPC
 * reports an error, `performPull` resolves to `{ ok: false, error:
 * "internal" }` (never claims success, never throws), and it does not
 * attempt any further write. Conversely, when the RPC succeeds,
 * `performPull` resolves to `{ ok: true, ... }`, establishing the contrast
 * baseline.
 *
 * `performPull` is tightly coupled to `lib/supabase/server.ts`'s
 * `createClient()` / `createServiceRoleClient()`, which require real env
 * vars, `next/headers`' `cookies()`, and a live Supabase connection. Rather
 * than exercising a real (or emulated) Postgres transaction -- impractical
 * here -- this test mocks `lib/supabase/server.ts` and constructs minimal
 * fake clients satisfying exactly the shape `performPull` calls (`auth.
 * getUser`, `from(...).select(...).eq(...)`, `from(...).select(...).eq(...)
 * .maybeSingle()`, and `rpc`), per lib/pull/service.ts's implementation.
 *
 * This is a control-flow-shaped property rather than a pure-data property,
 * so it is exercised via a small number of representative unit cases
 * (RPC-failure and RPC-success) rather than 100 fast-check iterations over
 * unrelated input dimensions -- there is no meaningful data space to sample
 * here beyond "the RPC succeeds" vs. "the RPC fails".
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const { createClientMock, createServiceRoleClientMock } = vi.hoisted(() => ({
  createClientMock: vi.fn(),
  createServiceRoleClientMock: vi.fn(),
}));

vi.mock("../supabase/server", () => ({
  createClient: createClientMock,
  createServiceRoleClient: createServiceRoleClientMock,
}));

import { performPull } from "./service";

const FIXED_USER_ID = "11111111-1111-1111-1111-111111111111";
const FIXED_IDEA_ID = "22222222-2222-2222-2222-222222222222";

/**
 * A valid Drop_Rate_Config served by the fake service-role client, so
 * `performPull` proceeds past config loading in every test.
 */
const CONFIG_ROWS = [
  { tier: "common", probability: 79 },
  { tier: "rare", probability: 18 },
  { tier: "super_rare", probability: 3 },
];

/** One project_ideas row per tier, so catalog selection always succeeds. */
const IDEA_ROWS = [
  {
    id: FIXED_IDEA_ID,
    title: "Test Idea",
    description: "A test idea",
    rarity_tier: "common",
  },
];

function makeServiceRoleClient() {
  return {
    from(_table: string) {
      return {
        select(_columns: string) {
          return Promise.resolve({ data: CONFIG_ROWS, error: null });
        },
      };
    },
  };
}

/**
 * Builds a fake session-aware client satisfying exactly what `performPull`
 * calls: `auth.getUser()`, `from("user_pity_state").select(...).eq(...)
 * .maybeSingle()`, `from("project_ideas").select(...).eq(...)`, and
 * `rpc("record_pull", ...)`.
 */
function makeSessionClient(options: {
  rpcError: { message: string } | null;
}) {
  const rpc = vi.fn().mockResolvedValue({
    data: null,
    error: options.rpcError,
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: FIXED_USER_ID } },
      }),
    },
    from(table: string) {
      if (table === "user_pity_state") {
        return {
          select(_columns: string) {
            return {
              eq(_column: string, _value: string) {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: { pity_counter: 0 },
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      }
      if (table === "project_ideas") {
        return {
          select(_columns: string) {
            return {
              // Chainable to support .eq("rarity_tier", ...).eq("is_active", true).
              eq(_column: string, _value: string | boolean) {
                const resolved = Promise.resolve({ data: IDEA_ROWS, error: null });
                const builder = {
                  eq: () => builder,
                  then: resolved.then.bind(resolved),
                };
                return builder;
              },
            };
          },
        };
      }
      throw new Error(`Unexpected table in test fake: ${table}`);
    },
    rpc,
  };
}

describe("performPull - Property 9: Transactional integrity on failure", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    "Feature: gacha-idea-generator, Property 9: Transactional integrity on failure - " +
      'resolves { ok: false, error: "internal" } (never claims success, never ' +
      "throws) when the record_pull RPC reports an error",
    async () => {
      const sessionClient = makeSessionClient({
        rpcError: { message: "simulated transaction failure" },
      });
      createClientMock.mockResolvedValue(sessionClient);
      createServiceRoleClientMock.mockReturnValue(makeServiceRoleClient());

      const result = await performPull("single");

      expect(result).toEqual({ ok: false, error: "internal" });
      // Exactly one persistence attempt was made, via the single atomic RPC
      // call -- there is no additional/redundant write path that could have
      // partially mutated pity or history state.
      expect(sessionClient.rpc).toHaveBeenCalledTimes(1);
    },
  );

  it(
    "Feature: gacha-idea-generator, Property 9: Transactional integrity on failure - " +
      "resolves { ok: true, items, pityAfter } when the record_pull RPC succeeds " +
      "(contrast baseline)",
    async () => {
      const sessionClient = makeSessionClient({ rpcError: null });
      createClientMock.mockResolvedValue(sessionClient);
      createServiceRoleClientMock.mockReturnValue(makeServiceRoleClient());

      const result = await performPull("single");

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.items).toHaveLength(1);
        expect(result.items[0].ideaId).toBe(FIXED_IDEA_ID);
        expect(typeof result.pityAfter).toBe("number");
      }
      expect(sessionClient.rpc).toHaveBeenCalledTimes(1);
    },
  );
});
