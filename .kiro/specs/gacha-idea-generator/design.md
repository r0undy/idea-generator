# Design Document

## Overview

The Gacha Idea Generator is a mobile-first Next.js (App Router) application backed by
Supabase (Postgres, Auth, Storage, Realtime). Users authenticate through Supabase Auth,
then perform single (1x) or batch (10x) pulls by tapping a 3D chest. All odds, pity
logic, batch guarantees, and idea selection are computed **server-side** in the
`Pull_Service` (a Route Handler / Server Action). The client never sees the
`Drop_Rate_Config` internals or the Supabase service-role key. Per-user `Pull_History`
and pity state persist in Postgres under Row Level Security (RLS).

The design prioritizes:
- **Authoritative server logic**: drawing, pity, and guarantees run only on the server.
- **Integrity**: pulls are persisted transactionally so a failure never corrupts pity or
  history.
- **Mobile-first UX**: narrow-viewport-first layout, >=44px tap targets, reduced-motion
  fallback, and in-progress locking.

## Architecture

### High-Level Flow

```
[Client (RSC + minimal "use client" islands)]
    | tap chest -> POST /api/pull { mode: "single" | "batch" }
    v
[Pull_Service  (Route Handler, server-only)]
    1. Authenticate via @supabase/ssr session  ---> reject if unauthenticated (401)
    2. Load Drop_Rate_Config (server-side)      ---> reject if sum != 100 (config-error)
    3. Load user_pity_state (RLS, server client)
    4. Validate catalog coverage per tier       ---> reject if missing tier (catalog-error)
    5. Run Draw Algorithm (config + pity + guarantees)
    6. Persist pull_history + user_pity_state ATOMICALLY (RPC transaction)
    7. Return results (tiers + idea content + new pity) 
    v
[Client] animate chest color -> reveal idea(s)
```

### Layering

- **Presentation (Server Components by default)**: page layout, history view, static
  chrome rendered on the server.
- **Interactive islands (`"use client"`)**: the 3D chest (`react-three-fiber`), pull
  buttons, in-progress state, and result reveal. These call the server; they contain no
  odds logic.
- **Server logic (`lib/pull/`)**: pure draw/pity functions plus the `Pull_Service` entry
  point. Pure functions are isolated from I/O so they are unit- and property-testable.
- **Data access (`lib/supabase/`)**: server client (service-role, server-only) and
  browser client (anon key). A Postgres RPC performs the atomic persistence.

### Directory Layout

```
app/
  layout.tsx
  page.tsx                      # pull screen (RSC shell)
  history/page.tsx              # history view (RSC, reads user's Pull_History)
  api/pull/route.ts             # Pull_Service Route Handler (server-only)
components/
  chest/Chest3D.tsx             # "use client" react-three-fiber chest
  chest/ChestReducedMotion.tsx  # reduced-motion fallback presentation
  pull/PullControls.tsx         # "use client" 1x / 10x buttons + in-progress lock
  pull/ResultReveal.tsx         # "use client" color -> content reveal
  history/HistoryList.tsx       # renders entries (idea, tier, timestamp)
  history/EmptyHistory.tsx
lib/
  pull/draw.ts                  # pure draw algorithm
  pull/pity.ts                  # pure pity transition + threshold logic
  pull/config.ts                # Drop_Rate_Config loading + sum validation (server-only)
  pull/service.ts               # orchestration used by the Route Handler
  pull/types.ts                 # RarityTier, PullResult, etc.
  supabase/server.ts            # server client (@supabase/ssr, service-role)
  supabase/client.ts            # browser client (anon key)
  database.types.ts             # generated Supabase types
```

## Components and Interfaces

### Rarity types

```typescript
export type RarityTier = "common" | "rare" | "super_rare";

export const RARITY_COLOR: Record<RarityTier, string> = {
  common: "silver",
  rare: "purple",
  super_rare: "gold",
};

export const PITY_THRESHOLD = 90;
```

### Drop_Rate_Config (server-side)

```typescript
export interface DropRateConfig {
  common: number;      // percent, e.g. 79
  rare: number;        // percent, e.g. 18
  super_rare: number;  // percent, e.g. 3
}

// Loaded from a server-side source (drop_rate_config table or server env),
// never sent to the client.
export function loadDropRateConfig(): Promise<DropRateConfig>;

// Rejects (throws ConfigError) when percentages do not sum to 100.
export function validateConfigSum(config: DropRateConfig): void;
```

### Pity logic (pure)

```typescript
// Given the pity counter BEFORE a pull, returns whether this pull is forced to
// super_rare by the pity threshold.
export function isPityForced(pityBefore: number): boolean {
  return pityBefore + 1 >= PITY_THRESHOLD;
}

// Given the counter before a pull and the awarded tier, returns the counter after.
export function nextPity(pityBefore: number, awarded: RarityTier): number {
  return awarded === "super_rare" ? 0 : pityBefore + 1;
}
```

### Draw algorithm (pure)

```typescript
export interface DrawInput {
  config: DropRateConfig;
  pityBefore: number;
  rng: () => number;        // injectable for deterministic tests
}

export interface SinglePullOutcome {
  tier: RarityTier;
  pityAfter: number;
}

// Chooses a tier honoring config; overridden to super_rare when pity is forced.
export function drawTier(input: DrawInput): SinglePullOutcome;

// Ten sequential single pulls; pity carries and is evaluated per pull.
// After the sequence, if no result is `rare` or higher, upgrades one slot to `rare`
// to satisfy the batch guarantee (chosen so pity accounting stays consistent).
export function drawBatch(input: DrawInput): {
  tiers: RarityTier[];      // length 10
  pityAfter: number;
};
```

Tier selection maps a uniform random value in [0,100) into cumulative bands defined by
`config` (common band, then rare, then super_rare). When `isPityForced` is true for a
pull, the outcome is `super_rare` regardless of the sampled band, and the pity counter
resets.

### Idea selection

After tiers are chosen, `Pull_Service` selects a concrete `Project_Idea` for each tier by
randomly picking from `project_ideas` rows of that tier. If any **required** tier has no
rows, the pull is rejected with a catalog-error before any persistence.

### Pull_Service interface

```typescript
export type PullMode = "single" | "batch";

export interface PullResultItem {
  ideaId: string;
  title: string;
  description: string;
  tier: RarityTier;
}

export type PullServiceResult =
  | { ok: true; items: PullResultItem[]; pityAfter: number }
  | { ok: false; error: "unauthenticated" | "config-error" | "catalog-error" | "internal" };

export async function performPull(mode: PullMode): Promise<PullServiceResult>;
```

### Atomic persistence (Postgres RPC)

A single `record_pull` RPC inserts the `pull_history` rows and updates
`user_pity_state.pity_counter` in one transaction, so the write is all-or-nothing.

```sql
-- pseudocode signature
record_pull(p_user_id uuid, p_items jsonb, p_new_pity int) returns void
-- BEGIN; insert pull_history rows; upsert user_pity_state; COMMIT;
```

## Data Models

### `project_ideas` (curated catalog, readable by authenticated users)

| Column       | Type        | Notes                                    |
|--------------|-------------|------------------------------------------|
| id           | uuid PK     | default gen_random_uuid()                |
| title        | text        | not null                                 |
| description  | text        | not null                                 |
| rarity_tier  | text        | not null, check in (common/rare/super_rare) |
| created_at   | timestamptz | default now()                            |

RLS: authenticated users may `select`; no client writes (seeded server-side).

### `pull_history` (per-user, RLS)

| Column       | Type        | Notes                                    |
|--------------|-------------|------------------------------------------|
| id           | uuid PK     | default gen_random_uuid()                |
| user_id      | uuid        | not null, references auth.users(id)      |
| idea_id      | uuid        | not null, references project_ideas(id)   |
| rarity_tier  | text        | not null                                 |
| pulled_at    | timestamptz | not null default now()                   |

RLS: `user_id = auth.uid()` for select/insert. Ordered by `pulled_at desc` for display.

### `user_pity_state` (per-user, RLS)

| Column        | Type        | Notes                                   |
|---------------|-------------|-----------------------------------------|
| user_id       | uuid PK     | references auth.users(id)               |
| pity_counter  | int         | not null default 0, check >= 0          |
| updated_at    | timestamptz | not null default now()                  |

RLS: `user_id = auth.uid()` for select/insert/update.

### `drop_rate_config` (server-side, service-role only)

| Column       | Type | Notes                                  |
|--------------|------|----------------------------------------|
| tier         | text | PK, in (common/rare/super_rare)        |
| probability  | int  | percent; defaults 79 / 18 / 3          |

RLS: no policy grants client access; read only via server client (service-role). This
keeps odds tunable without a client redeploy and never exposed to the client.

## Error Handling

| Condition                                   | Response                | Integrity guarantee                     |
|---------------------------------------------|-------------------------|-----------------------------------------|
| Unauthenticated request                     | 401 `unauthenticated`   | No reads/writes of user data            |
| Config sum != 100                           | `config-error`          | Reject before draw; no persistence      |
| Required tier has no catalog rows           | `catalog-error`         | Reject before draw; no persistence      |
| Failure before commit (DB / RPC error)      | `internal` + retry UI   | Transaction rolls back; pity+history unchanged |
| Overlapping pull while one is in progress   | Client blocks request   | Only one in-flight pull                 |

Persistence uses a single transactional RPC so a mid-write failure leaves both
`pull_history` and `user_pity_state` untouched. The client shows an error state with a
retry affordance and re-enables controls only after the request resolves.

## Frontend / UX Design

- **Mobile-first**: base styles target narrow viewports; `sm:`/`md:`/`lg:` enhance layout
  for larger screens. Chest and controls are centered and reachable with one thumb.
- **Tap targets**: pull buttons use `min-h-11 min-w-11` (>=44px) with comfortable spacing.
- **3D chest**: `react-three-fiber` chest emits the `Rarity_Color` (silver/purple/gold)
  during a charge-up phase **before** opening to reveal the idea, so the color previews
  rarity. For batch pulls the highest tier drives the pre-reveal color.
- **Reduced motion**: when `prefers-reduced-motion` is set, `ChestReducedMotion` renders a
  static color badge + result instead of the animation.
- **In-progress lock**: a `pending` state disables the buttons and shows a spinner/label;
  new taps are ignored until the current request settles (single-flight).
- **History view**: server component lists entries newest-first with idea content, tier
  (and its color), and timestamp; shows an empty state when there are no pulls.

## Security

- Service-role key used only in `lib/supabase/server.ts` (server modules); never imported
  into client components.
- `Drop_Rate_Config` lives in a service-role-only table and is read exclusively by the
  `Pull_Service`; responses to the client contain only awarded results, never raw odds.
- RLS enforces per-user isolation for `pull_history` and `user_pity_state`; the client
  cannot read or write another user's rows even with the anon key.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid
executions of a system-essentially, a formal statement about what the system should do.
Properties serve as the bridge between human-readable specifications and machine-verifiable
correctness guarantees.*

### Property 1: Single pull produces exactly one valid, tier-consistent result

*For any* valid `Drop_Rate_Config` and any non-negative pity value, a single pull SHALL
produce exactly one result whose `Rarity_Tier` is one of `common`, `rare`, or `super_rare`,
and whose selected `Project_Idea` belongs to that tier.

**Validates: Requirements 2.1**

### Property 2: Pity counter transition rule

*For any* pity value before a pull and any awarded `Rarity_Tier`, the pity counter after
the pull SHALL equal zero when the awarded tier is `super_rare`, and SHALL equal the prior
value plus one otherwise.

**Validates: Requirements 2.4, 4.1, 4.3**

### Property 3: Pity threshold guarantees super rare

*For any* valid `Drop_Rate_Config`, when a pull's incoming pity counter would reach the
`Pity_Threshold` of 90, that pull SHALL award a `super_rare` `Project_Idea` and reset the
counter to zero.

**Validates: Requirements 4.2**

### Property 4: Batch pull yields exactly ten valid results

*For any* valid `Drop_Rate_Config` and any starting pity value, a batch pull SHALL produce
exactly ten results, each with a valid `Rarity_Tier` and a selected `Project_Idea`
belonging to that tier.

**Validates: Requirements 3.1**

### Property 5: Batch guarantees at least one rare-or-higher

*For any* valid `Drop_Rate_Config` and any starting pity value, a batch pull result SHALL
contain at least one `Project_Idea` of `Rarity_Tier` `rare` or `super_rare`.

**Validates: Requirements 3.2**

### Property 6: Batch pity is evaluated sequentially per pull

*For any* starting pity value, the pity counter after a batch pull SHALL equal the result
of applying the per-pull pity transition rule to each of the ten pulls in sequence, and
any pull whose incoming counter reaches the threshold within the batch SHALL be
`super_rare` with a reset at that point.

**Validates: Requirements 3.4, 4.4**

### Property 7: Configuration sum validation

*For any* `Drop_Rate_Config` whose tier probabilities do not sum to 100 percent, the
`Pull_Service` SHALL reject the pull with a configuration-error response and perform no
persistence.

**Validates: Requirements 5.4**

### Property 8: Catalog completeness enforcement

*For any* catalog state in which a required `Rarity_Tier` has no `Project_Idea` rows, the
`Pull_Service` SHALL reject the pull with a catalog-error response and perform no
persistence.

**Validates: Requirements 8.3**

### Property 9: Transactional integrity on failure

*For any* pull that fails before results are committed, the User's `Pity_Counter` and
`Pull_History` SHALL remain identical to their pre-pull values.

**Validates: Requirements 8.1**

### Property 10: History records preserve awarded results

*For any* single or batch pull outcome, the `Pull_History` entries constructed for it SHALL
preserve, for every awarded idea, the same idea identifier and `Rarity_Tier` that were
drawn, with one entry per awarded idea.

**Validates: Requirements 2.3, 3.3**

### Property 11: History ordering is most-recent-first

*For any* set of `Pull_History` entries, the displayed order SHALL be non-increasing by
pull timestamp (most recent to least recent).

**Validates: Requirements 6.2**

### Property 12: History rendering completeness

*For any* `Pull_History` entry, the rendered history view SHALL include the awarded
`Project_Idea` content, its `Rarity_Tier`, and its pull timestamp.

**Validates: Requirements 6.1**

### Property 13: In-progress single-flight lock

*For any* sequence of pull initiations issued while a pull is already in progress, the
System SHALL have at most one in-flight pull request; additional initiations SHALL be
prevented until the current request resolves.

**Validates: Requirements 7.4**

## Testing Strategy

### Dual Testing Approach

- **Unit / example tests**: default config values (79/18/3), Rarity_Color mapping, empty
  history state, reduced-motion fallback selection, >=44px tap-target dimensions, and the
  color-before-content reveal ordering.
- **Property-based tests**: the pure `draw`, `pity`, config-validation, catalog-check,
  history-record-builder, and history-ordering functions. Injectable RNG makes draws
  deterministic and lets generators explore edge cases (pity near threshold, skewed
  configs, sparse catalogs).
- **Integration tests**: Supabase Auth association, cross-device load, RLS isolation,
  server-side placement of draw logic, config tunability without client redeploy, and
  non-exposure of the service-role key / config internals.

### Property Test Configuration

- Minimum 100 iterations per property test.
- Each property test references its design property using the tag format:
  **Feature: gacha-idea-generator, Property {number}: {property_text}**.
- Recommended tooling: `fast-check` with the project's test runner (e.g. Vitest) for the
  pure logic in `lib/pull/`.
