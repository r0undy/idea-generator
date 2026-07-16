/**
 * Drop_Rate_Config loading and sum validation (server-only).
 *
 * This module reads the `drop_rate_config` table, which is service-role-only
 * (see design.md > "Data Models" > `drop_rate_config` and Requirement 5.5).
 * It must never be imported from client components.
 *
 * The Supabase client is accepted as a parameter (dependency injection)
 * rather than imported directly, because `lib/supabase/server.ts` (task 3.1)
 * does not exist yet. `SupabaseSelectClient` describes the minimal shape this
 * module needs and is structurally compatible with the real
 * `@supabase/supabase-js` / `@supabase/ssr` client once it is introduced.
 *
 * See design.md > "Components and Interfaces" > "Drop_Rate_Config
 * (server-side)" for the authoritative interface.
 */

import type { DropRateConfig, RarityTier } from "./types";

/** A single row of the `drop_rate_config` table. */
export interface DropRateConfigRow {
  tier: RarityTier;
  probability: number;
}

/**
 * Minimal structural shape of the Supabase client required to load the
 * Drop_Rate_Config. Matches the `supabase.from(table).select(columns)`
 * pattern used by `@supabase/supabase-js`.
 */
export interface SupabaseSelectClient {
  from(table: string): {
    select(columns: string): PromiseLike<{
      data: DropRateConfigRow[] | null;
      error: { message: string } | null;
    }>;
  };
}

/**
 * Thrown when the Drop_Rate_Config cannot be loaded or its tier
 * probabilities do not sum to 100 percent.
 *
 * Requirement 5.4: IF the Drop_Rate_Config probabilities for a pull do not
 * sum to 100 percent, THEN THE Pull_Service SHALL reject the pull and
 * return a configuration-error response.
 */
export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const REQUIRED_TIERS: RarityTier[] = ["common", "rare", "super_rare"];

/**
 * Throws a ConfigError when the tier probabilities do not sum to 100.
 *
 * Requirements: 5.4
 */
export function validateConfigSum(config: DropRateConfig): void {
  const sum = config.common + config.rare + config.super_rare;
  if (sum !== 100) {
    throw new ConfigError(
      `Drop_Rate_Config probabilities must sum to 100, got ${sum} ` +
        `(common=${config.common}, rare=${config.rare}, super_rare=${config.super_rare})`,
    );
  }
}

/**
 * Loads the Drop_Rate_Config from the `drop_rate_config` table using the
 * provided server-side Supabase client, and validates that the tier
 * probabilities sum to 100 before returning it.
 *
 * Server-only: `client` must be a service-role client (see
 * `lib/supabase/server.ts`, task 3.1). Never call this from client
 * components or expose its result to the client.
 *
 * Requirements: 5.1, 5.2, 5.4
 */
export async function loadDropRateConfig(
  client: SupabaseSelectClient,
): Promise<DropRateConfig> {
  const { data, error } = await client
    .from("drop_rate_config")
    .select("tier, probability");

  if (error) {
    throw new ConfigError(`Failed to load Drop_Rate_Config: ${error.message}`);
  }

  const rows = data ?? [];
  const byTier = new Map(rows.map((row) => [row.tier, row.probability]));

  for (const tier of REQUIRED_TIERS) {
    if (!byTier.has(tier)) {
      throw new ConfigError(
        `Drop_Rate_Config is missing a probability for tier "${tier}"`,
      );
    }
  }

  const config: DropRateConfig = {
    common: byTier.get("common")!,
    rare: byTier.get("rare")!,
    super_rare: byTier.get("super_rare")!,
  };

  validateConfigSum(config);

  return config;
}
