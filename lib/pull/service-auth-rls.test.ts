/**
 * Integration-shaped tests for auth association, RLS isolation, and
 * cross-device/session pity consistency against `performPull` (task 7.2).
 *
 * Feature: gacha-idea-generator
 * Validates: Requirements 1.2, 1.3, 1.4
 *
 * ---------------------------------------------------------------------------
 * Honest scope note (same constraint as tasks 6.1-6.7 and
 * app/api/pull/route.test.ts): this workspace has no linked Supabase
 * project and no running Postgres instance, so a true integration test
 * against real Supabase Auth sessions and real Postgres RLS policies is not
 * feasible here. What follows is verified at the mock/unit level by
 * constructing fake Supabase clients that satisfy exactly the shape
 * `performPull` (lib/pull/service.ts) calls, following the same pattern as
 * `lib/pull/service-transactional-integrity.test.ts`:
 *
 *   - Requirement 1.2 (per-user association): the `record_pull` RPC is
 *     invoked with `p_user_id` equal to the id returned by
 *     `supabase.auth.getUser()` -- i.e. server-derived identity -- never a
 *     hardcoded or otherwise-supplied value. This demonstrates the design's
 *     reliance on the authenticated session rather than trusting client
 *     input for whose account a pull is recorded against.
 *   - Requirement 1.4 (RLS isolation, demonstrated via contrast): two
 *     separate fake clients representing two different authenticated users
 *     each read/write only rows scoped to their own `user_id` -- the fake
 *     `user_pity_state` reader is parameterized per-user, and each user's
 *     `record_pull` call carries that user's own id, never the other
 *     user's. Real RLS enforcement (that user A's anon-key session
 *     literally cannot select/update user B's Postgres rows) can only be
 *     verified against a live Supabase project with the actual RLS
 *     policies applied (see supabase/migrations for the policy
 *     definitions) -- that is NOT exercised here.
 *   - Requirement 1.3 (cross-device consistency, best-effort at this mock
 *     level): calling `performPull` twice with the same user id, where the
 *     second call's fake `user_pity_state` reader returns the pity value
 *     produced by the first call's outcome, shows that pity correctly
 *     carries across separate `performPull` invocations -- standing in for
 *     what would be two separate devices/sessions reading the same
 *     database row. This does not touch a real database, so it does not
 *     prove persistence actually round-trips through Postgres; it only
 *     proves `performPull`'s logic doesn't depend on any in-memory state
 *     that would break cross-request/cross-device reads.
 * ---------------------------------------------------------------------------
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

const USER_A_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const USER_B_ID = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const IDEA_ID = "22222222-2222-2222-2222-222222222222";

const CONFIG_ROWS = [
  { tier: "common", probability: 79 },
  { tier: "rare", probability: 18 },
  { tier: "super_rare", probability: 3 },
];

const IDEA_ROWS = [
  {
    id: IDEA_ID,
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
 * Builds a fake session-aware client scoped to a single authenticated user,
 * whose `user_pity_state` read is parameterized by `pityCounter` (standing
 * in for "whatever this user's row currently holds in Postgres") and whose
 * `rpc` call is recorded so tests can assert which `p_user_id` it carried.
 */
function makeSessionClientForUser(options: {
  userId: string;
  pityCounter: number;
}) {
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: options.userId } },
      }),
    },
    from(table: string) {
      if (table === "user_pity_state") {
        return {
          select(_columns: string) {
            return {
              eq(column: string, value: string) {
                // Mirrors RLS's `user_id = auth.uid()` scoping: the fake
                // reader only returns a row when queried for this client's
                // own user id.
                expect(column).toBe("user_id");
                expect(value).toBe(options.userId);
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: { pity_counter: options.pityCounter },
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

describe("performPull - auth association and RLS isolation (task 7.2)", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it(
    "Requirement 1.2: record_pull is called with p_user_id equal to the " +
      "server-derived auth.getUser() id, not a hardcoded or client-supplied value",
    async () => {
      const sessionClient = makeSessionClientForUser({
        userId: USER_A_ID,
        pityCounter: 0,
      });
      createClientMock.mockResolvedValue(sessionClient);
      createServiceRoleClientMock.mockReturnValue(makeServiceRoleClient());

      const result = await performPull("single");

      expect(result.ok).toBe(true);
      expect(sessionClient.rpc).toHaveBeenCalledTimes(1);
      const [rpcName, rpcArgs] = sessionClient.rpc.mock.calls[0];
      expect(rpcName).toBe("record_pull");
      expect(rpcArgs.p_user_id).toBe(USER_A_ID);
    },
  );

  it(
    "Requirement 1.4 (isolation, demonstrated by contrast): two different " +
      "authenticated users each produce a record_pull call scoped to their " +
      "own id, and each one's pity read is only ever queried by their own id",
    async () => {
      const sessionClientA = makeSessionClientForUser({
        userId: USER_A_ID,
        pityCounter: 5,
      });
      const sessionClientB = makeSessionClientForUser({
        userId: USER_B_ID,
        pityCounter: 12,
      });
      createServiceRoleClientMock.mockReturnValue(makeServiceRoleClient());

      createClientMock.mockResolvedValueOnce(sessionClientA);
      const resultA = await performPull("single");

      createClientMock.mockResolvedValueOnce(sessionClientB);
      const resultB = await performPull("single");

      expect(resultA.ok).toBe(true);
      expect(resultB.ok).toBe(true);

      const [, rpcArgsA] = sessionClientA.rpc.mock.calls[0];
      const [, rpcArgsB] = sessionClientB.rpc.mock.calls[0];
      expect(rpcArgsA.p_user_id).toBe(USER_A_ID);
      expect(rpcArgsB.p_user_id).toBe(USER_B_ID);
      // Each user's RPC call is independent -- neither call's p_user_id
      // leaked into the other's.
      expect(rpcArgsA.p_user_id).not.toBe(rpcArgsB.p_user_id);
    },
  );

  it(
    "Requirement 1.3 (cross-device consistency, best-effort): a second " +
      "performPull call for the same user, whose fake pity read reflects the " +
      "pityAfter produced by the first call, carries pity forward correctly " +
      "-- standing in for the same user loading their pity on a second device",
    async () => {
      createServiceRoleClientMock.mockReturnValue(makeServiceRoleClient());

      // "Device 1": first pull, starting from pity 0.
      const sessionClientDevice1 = makeSessionClientForUser({
        userId: USER_A_ID,
        pityCounter: 0,
      });
      createClientMock.mockResolvedValueOnce(sessionClientDevice1);
      const firstResult = await performPull("single");
      expect(firstResult.ok).toBe(true);
      const pityAfterFirstPull = firstResult.ok ? firstResult.pityAfter : -1;

      // "Device 2": same user signs in elsewhere; the row it reads reflects
      // the value persisted after the first pull (i.e. what a real
      // cross-device load from Postgres would return).
      const sessionClientDevice2 = makeSessionClientForUser({
        userId: USER_A_ID,
        pityCounter: pityAfterFirstPull,
      });
      createClientMock.mockResolvedValueOnce(sessionClientDevice2);
      const secondResult = await performPull("single");
      expect(secondResult.ok).toBe(true);

      // Pity accumulated correctly across the two "sessions": the second
      // call's pityAfter should be exactly one more than the first call's
      // unless the (unseeded) draw happened to award super_rare, which
      // resets the counter to zero. Either way, confirm state read on
      // "device 2" picked up where "device 1" left off (pityAfter_1) rather
      // than starting over from an unrelated/hardcoded value.
      if (firstResult.ok && secondResult.ok) {
        const secondTier = secondResult.items[0].tier;
        const expectedPityAfter =
          secondTier === "super_rare" ? 0 : pityAfterFirstPull + 1;
        expect(secondResult.pityAfter).toBe(expectedPityAfter);
      }

      const [, rpcArgsDevice1] = sessionClientDevice1.rpc.mock.calls[0];
      const [, rpcArgsDevice2] = sessionClientDevice2.rpc.mock.calls[0];
      expect(rpcArgsDevice1.p_user_id).toBe(USER_A_ID);
      expect(rpcArgsDevice2.p_user_id).toBe(USER_A_ID);
    },
  );
});
