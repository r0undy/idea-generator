/**
 * Pull_Service orchestration: idea selection and catalog-completeness check.
 *
 * Design.md > "Idea selection": "After tiers are chosen, Pull_Service
 * selects a concrete Project_Idea for each tier by randomly picking from
 * project_ideas rows of that tier. If any required tier has no rows, the
 * pull is rejected with a catalog-error before any persistence."
 *
 * The Supabase client is accepted as a parameter (dependency injection)
 * rather than imported directly, mirroring `lib/pull/config.ts`'s
 * `SupabaseSelectClient`. This keeps the module testable without a real
 * Supabase connection and lets the eventual Route Handler (task 7.1) wire
 * in `lib/supabase/server.ts` (task 3.1) once it exists.
 *
 * Requirements: 2.1, 3.1, 8.3
 */

import type { PullResultItem, RarityTier } from "./types";

/** A single row of the `project_ideas` table. */
export interface ProjectIdeaRow {
  id: string;
  title: string;
  description: string;
  rarity_tier: RarityTier;
}

/**
 * A chainable, awaitable filter builder (the subset of Supabase's
 * PostgrestFilterBuilder we use): each `.eq(...)` narrows the query and the
 * builder itself resolves to the rows. This lets us chain
 * `.eq("rarity_tier", tier).eq("is_active", true)`.
 */
export interface IdeaFilterBuilder
  extends PromiseLike<{
    data: ProjectIdeaRow[] | null;
    error: { message: string } | null;
  }> {
  eq(column: string, value: string | boolean): IdeaFilterBuilder;
}

/**
 * Minimal structural shape of the Supabase client required to select
 * catalog ideas by tier. Matches the
 * `supabase.from(table).select(columns).eq(column, value)` pattern used by
 * `@supabase/supabase-js`.
 */
export interface SupabaseIdeaSelectClient {
  from(table: string): {
    select(columns: string): {
      eq(column: string, value: string): IdeaFilterBuilder;
    };
  };
}

/**
 * Thrown when the `project_ideas` catalog has no rows for a Rarity_Tier
 * required by the current pull.
 *
 * Requirement 8.3: IF the `project_ideas` catalog contains no Project_Idea
 * for a required Rarity_Tier, THEN THE Pull_Service SHALL reject the pull
 * and return a catalog-error response.
 */
export class CatalogError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CatalogError";
  }
}

function mapRowToResultItem(row: ProjectIdeaRow): PullResultItem {
  return {
    ideaId: row.id,
    title: row.title,
    description: row.description,
    tier: row.rarity_tier,
  };
}

/**
 * Fetches all `project_ideas` rows for a single Rarity_Tier.
 *
 * Throws a CatalogError (before any persistence) when the tier has no
 * rows, or when the underlying query fails.
 */
async function fetchIdeasForTier(
  client: SupabaseIdeaSelectClient,
  tier: RarityTier,
): Promise<ProjectIdeaRow[]> {
  // Only active (currently-seeded) ideas are drawable; retired rows are kept
  // for pull_history FK integrity but excluded here (see the reseed migration).
  const { data, error } = await client
    .from("project_ideas")
    .select("id, title, description, rarity_tier")
    .eq("rarity_tier", tier)
    .eq("is_active", true);

  if (error) {
    throw new CatalogError(
      `Failed to load project_ideas for tier "${tier}": ${error.message}`,
    );
  }

  const rows = data ?? [];
  if (rows.length === 0) {
    throw new CatalogError(
      `The project_ideas catalog has no rows for required tier "${tier}"`,
    );
  }

  return rows;
}

/**
 * Selects a single concrete Project_Idea for the given tier by randomly
 * picking among the catalog rows assigned to that tier.
 *
 * Rejects with a CatalogError before any persistence when the tier has no
 * rows.
 *
 * `rng` is injectable (defaults to `Math.random`) so selection is
 * deterministic and testable, mirroring `DrawInput.rng` in
 * `lib/pull/types.ts`. It must return a value in [0, 1).
 *
 * Requirements: 2.1, 8.3
 */
export async function selectIdeaForTier(
  client: SupabaseIdeaSelectClient,
  tier: RarityTier,
  rng: () => number = Math.random,
): Promise<PullResultItem> {
  const rows = await fetchIdeasForTier(client, tier);
  const index = Math.floor(rng() * rows.length) % rows.length;
  return mapRowToResultItem(rows[index]);
}

/**
 * Selects a concrete Project_Idea for each tier in `tiers` (in order),
 * randomly picking among the catalog rows assigned to each drawn tier.
 *
 * Fetches catalog rows once per distinct tier (rather than once per draw)
 * and rejects with a CatalogError before any persistence if any required
 * tier -- i.e. any tier present in `tiers` -- has no rows. Used for both
 * Single_Pull (`tiers.length === 1`) and Batch_Pull (`tiers.length === 10`).
 *
 * Requirements: 2.1, 3.1, 8.3
 */
export async function selectIdeasForTiers(
  client: SupabaseIdeaSelectClient,
  tiers: RarityTier[],
  rng: () => number = Math.random,
): Promise<PullResultItem[]> {
  const uniqueTiers = Array.from(new Set(tiers));
  const rowsByTier = new Map<RarityTier, ProjectIdeaRow[]>();

  for (const tier of uniqueTiers) {
    rowsByTier.set(tier, await fetchIdeasForTier(client, tier));
  }

  return tiers.map((tier) => {
    const rows = rowsByTier.get(tier)!;
    const index = Math.floor(rng() * rows.length) % rows.length;
    return mapRowToResultItem(rows[index]);
  });
}

/**
 * The shape of a single `p_items` array element accepted by the `record_pull`
 * Postgres RPC (see supabase/migrations/20250101000003_gacha_record_pull_rpc.sql
 * and lib/database.types.ts's `record_pull` Args). Field names match the
 * `pull_history` columns the RPC inserts into.
 */
export interface PullHistoryRecord {
  idea_id: string;
  rarity_tier: RarityTier;
}

/**
 * Pure mapping from awarded pull results to the `pull_history` record shape
 * expected by the `record_pull` RPC's `p_items` argument: one record per
 * awarded idea, preserving the idea's id and rarity tier.
 *
 * No I/O is performed here; this is a pure function so it can be unit- and
 * property-tested independently of Supabase.
 *
 * Requirements: 2.3, 3.3
 */
export function buildPullHistoryRecords(
  items: PullResultItem[],
): PullHistoryRecord[] {
  return items.map((item) => ({
    idea_id: item.ideaId,
    rarity_tier: item.tier,
  }));
}

/**
 * `performPull` orchestration.
 *
 * Wires together auth, config loading, pity-state reading, catalog-backed
 * idea selection, and atomic persistence via the `record_pull` RPC. This is
 * the single entry point the Route Handler (task 7.1) calls.
 *
 * See design.md > "Components and Interfaces" > "Pull_Service interface"
 * and > "Error Handling" for the authoritative contract, and
 * supabase/migrations/20250101000003_gacha_record_pull_rpc.sql for the
 * `record_pull` RPC's transactional/security-invoker semantics.
 *
 * Requirements: 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 5.1, 8.1
 */

import { createClient, createServiceRoleClient } from "../supabase/server";
import type { Json } from "../database.types";
import { ConfigError, loadDropRateConfig } from "./config";
import { drawBatch, drawTier } from "./draw";
import type { PullMode, PullServiceResult } from "./types";

/**
 * Reads the caller's pity counter from `user_pity_state` via the
 * session-aware (RLS-scoped) client, defaulting to 0 when the user has no
 * row yet (i.e. before their first pull).
 */
async function loadPityCounter(
  client: Awaited<ReturnType<typeof createClient>>,
  userId: string,
): Promise<number> {
  const { data, error } = await client
    .from("user_pity_state")
    .select("pity_counter")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.pity_counter ?? 0;
}

/**
 * Authenticates the caller, loads and validates the Drop_Rate_Config, loads
 * the caller's pity state, runs the draw algorithm for `mode`, selects
 * concrete Project_Ideas per drawn tier (validating catalog coverage), and
 * persists the pull atomically via the `record_pull` RPC.
 *
 * Returns `{ ok: false, error: "unauthenticated" }` when there is no
 * authenticated session, `"config-error"` when the Drop_Rate_Config is
 * missing or its probabilities don't sum to 100, `"catalog-error"` when a
 * required Rarity_Tier has no `project_ideas` rows, and `"internal"` when
 * persistence fails. In every failure case, no persistence occurs (or, for
 * the RPC-failure case, the RPC's own transaction guarantees the write was
 * rolled back) — the caller's `pity_counter` and `pull_history` remain
 * exactly as they were before the call.
 *
 * Requirements: 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 5.1, 8.1
 */
export async function performPull(mode: PullMode): Promise<PullServiceResult> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  let config;
  try {
    const serviceRoleClient = createServiceRoleClient();
    config = await loadDropRateConfig(serviceRoleClient);
  } catch (err) {
    if (err instanceof ConfigError) {
      return { ok: false, error: "config-error" };
    }
    throw err;
  }

  const pityBefore = await loadPityCounter(supabase, user.id);

  let tiers: RarityTier[];
  let pityAfter: number;
  if (mode === "single") {
    const outcome = drawTier({ config, pityBefore, rng: Math.random });
    tiers = [outcome.tier];
    pityAfter = outcome.pityAfter;
  } else {
    const outcome = drawBatch({ config, pityBefore, rng: Math.random });
    tiers = outcome.tiers;
    pityAfter = outcome.pityAfter;
  }

  let items;
  try {
    items = await selectIdeasForTiers(
      supabase as unknown as SupabaseIdeaSelectClient,
      tiers,
    );
  } catch (err) {
    if (err instanceof CatalogError) {
      return { ok: false, error: "catalog-error" };
    }
    throw err;
  }

  const pItems = buildPullHistoryRecords(items);

  const { error: rpcError } = await supabase.rpc("record_pull", {
    p_user_id: user.id,
    p_items: pItems as unknown as Json,
    p_new_pity: pityAfter,
  });

  if (rpcError) {
    return { ok: false, error: "internal" };
  }

  return { ok: true, items, pityAfter };
}
