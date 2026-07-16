# Implementation Plan: Gacha Idea Generator

## Overview

This plan builds the Gacha Idea Generator incrementally: first the Supabase data layer
(schema, RLS, seed data, generated types), then the server-side Supabase clients, then
the pure draw/pity/config logic (with property tests), followed by the `Pull_Service`
Route Handler and atomic persistence RPC, auth integration, and finally the mobile-first
UI (3D chest with reduced-motion fallback, pull controls, result reveal, history view)
and end-to-end error handling. Each step builds on prior ones and wires into the running
app so no code is left orphaned. Implementation language is **TypeScript** (Next.js App
Router + Supabase), as established in the design.

## Tasks

- [x] 1. Set up project scaffolding and shared types
  - [x] 1.1 Establish Next.js/Tailwind project structure and shared rarity types
    - Ensure `app/`, `components/`, and `lib/` directories exist per the design layout
    - Create `lib/pull/types.ts` with `RarityTier`, `RARITY_COLOR`, `PITY_THRESHOLD`,
      `DropRateConfig`, `DrawInput`, `SinglePullOutcome`, `PullMode`, `PullResultItem`,
      and `PullServiceResult`
    - Configure Tailwind design tokens (rarity colors: silver/purple/gold) in the config
    - _Requirements: 2.2, 5.3, 7.1_

- [x] 2. Create Supabase schema, RLS, and seed data
  - [x] 2.1 Write migration for catalog and per-user tables
    - Create `project_ideas`, `pull_history`, `user_pity_state`, and `drop_rate_config`
      tables with columns, defaults, and check constraints from the Data Models section
    - Add foreign keys to `auth.users(id)` and `project_ideas(id)`
    - _Requirements: 1.4, 2.3, 4.1, 5.2, 6.1_

  - [x] 2.2 Add Row Level Security policies
    - Enable RLS on all four tables
    - `project_ideas`: authenticated `select` only, no client writes
    - `pull_history` and `user_pity_state`: `user_id = auth.uid()` for select/insert/update
    - `drop_rate_config`: no client-accessible policy (service-role only)
    - _Requirements: 1.4, 5.5_

  - [x] 2.3 Seed the catalog and default drop-rate config
    - Insert curated `project_ideas` rows covering all three tiers
      (`common`, `rare`, `super_rare`) so every required tier has entries
    - Seed `drop_rate_config` with defaults 79 / 18 / 3
    - _Requirements: 5.3, 8.3_

  - [x] 2.4 Generate typed Supabase definitions
    - Produce `lib/database.types.ts` from the schema and wire it into client typings
    - _Requirements: 5.2_

- [x] 3. Set up Supabase clients
  - [x] 3.1 Implement server and browser Supabase clients
    - Create `lib/supabase/server.ts` using `@supabase/ssr` with the service-role key,
      server-only (never imported by client components)
    - Create `lib/supabase/client.ts` using the anon key for the browser
    - Read keys from environment variables; never expose service-role to the client
    - _Requirements: 5.5, 1.2_

- [x] 4. Implement pure config, pity, and draw logic
  - [x] 4.1 Implement Drop_Rate_Config loading and sum validation
    - Create `lib/pull/config.ts` with `loadDropRateConfig()` (server-only, reads
      `drop_rate_config`) and `validateConfigSum()` that throws a `ConfigError` when the
      tier probabilities do not sum to 100
    - _Requirements: 5.1, 5.2, 5.4_

  - [x]* 4.2 Write property test for configuration sum validation
    - **Property 7: Configuration sum validation**
    - **Validates: Requirements 5.4**

  - [x] 4.3 Implement pity transition and threshold logic
    - Create `lib/pull/pity.ts` with `isPityForced(pityBefore)` and
      `nextPity(pityBefore, awarded)` per the design
    - _Requirements: 4.1, 4.2, 4.3, 2.4_

  - [x]* 4.4 Write property test for pity counter transition rule
    - **Property 2: Pity counter transition rule**
    - **Validates: Requirements 2.4, 4.1, 4.3**

  - [x]* 4.5 Write property test for pity threshold guarantee
    - **Property 3: Pity threshold guarantees super rare**
    - **Validates: Requirements 4.2**

  - [x] 4.6 Implement single-pull draw algorithm
    - Create `lib/pull/draw.ts` `drawTier(input)`: map an injectable RNG value into
      cumulative config bands, override to `super_rare` when `isPityForced`, and return
      `pityAfter`
    - _Requirements: 2.1, 5.1_

  - [x]* 4.7 Write property test for single pull validity
    - **Property 1: Single pull produces exactly one valid, tier-consistent result**
    - **Validates: Requirements 2.1**

  - [x] 4.8 Implement batch draw algorithm with guarantee
    - Add `drawBatch(input)` to `lib/pull/draw.ts`: ten sequential single pulls with pity
      carried per pull; upgrade one slot to `rare` if no result is `rare`-or-higher, kept
      consistent with pity accounting; return `tiers` (length 10) and `pityAfter`
    - _Requirements: 3.1, 3.2, 3.4, 4.4_

  - [x]* 4.9 Write property test for batch size validity
    - **Property 4: Batch pull yields exactly ten valid results**
    - **Validates: Requirements 3.1**

  - [x]* 4.10 Write property test for batch rare-or-higher guarantee
    - **Property 5: Batch guarantees at least one rare-or-higher**
    - **Validates: Requirements 3.2**

  - [x]* 4.11 Write property test for sequential batch pity evaluation
    - **Property 6: Batch pity is evaluated sequentially per pull**
    - **Validates: Requirements 3.4, 4.4**

- [x] 5. Checkpoint - pure logic verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Pull_Service orchestration and persistence
  - [x] 6.1 Create atomic persistence RPC
    - Add a `record_pull(p_user_id, p_items jsonb, p_new_pity int)` Postgres function that
      inserts `pull_history` rows and upserts `user_pity_state` in one transaction
    - _Requirements: 2.3, 3.3, 4.1, 8.1_

  - [x] 6.2 Implement idea selection and catalog check
    - In `lib/pull/service.ts`, select a concrete `Project_Idea` per drawn tier from
      `project_ideas`; reject with `catalog-error` before any persistence when a required
      tier has no rows
    - _Requirements: 2.1, 3.1, 8.3_

  - [x]* 6.3 Write property test for catalog completeness enforcement
    - **Property 8: Catalog completeness enforcement**
    - **Validates: Requirements 8.3**

  - [x] 6.4 Implement history-record builder
    - Add a pure helper in `lib/pull/service.ts` that maps drawn outcomes to
      `pull_history` entries (one per awarded idea, preserving idea id and tier)
    - _Requirements: 2.3, 3.3_

  - [x]* 6.5 Write property test for history record preservation
    - **Property 10: History records preserve awarded results**
    - **Validates: Requirements 2.3, 3.3**

  - [x] 6.6 Implement performPull orchestration
    - Implement `performPull(mode)` in `lib/pull/service.ts`: authenticate, load and
      validate config, load pity state, validate catalog, run draw, select ideas, then
      persist atomically via `record_pull`; return `PullServiceResult`
    - Return `internal` and leave pity/history unchanged if persistence fails
    - _Requirements: 2.1, 2.3, 2.4, 3.1, 3.3, 3.4, 5.1, 8.1_

  - [x]* 6.7 Write property test for transactional integrity on failure
    - **Property 9: Transactional integrity on failure**
    - **Validates: Requirements 8.1**

- [x] 7. Implement Pull_Service Route Handler and auth integration
  - [x] 7.1 Create the /api/pull Route Handler
    - Add `app/api/pull/route.ts` (server-only) that reads `{ mode }`, authenticates via
      `@supabase/ssr` session, calls `performPull`, and returns 401 `unauthenticated` for
      unauthenticated requests and mapped error responses otherwise
    - _Requirements: 1.1, 1.2, 5.1, 5.5, 8.2, 8.3_

  - [x]* 7.2 Write integration tests for auth, RLS, and server placement
    - Verify unauthenticated rejection, per-user association, cross-device load of the
      same history/pity, RLS isolation between users, and non-exposure of the
      service-role key / config internals
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 5.5_

- [x] 8. Checkpoint - server pipeline verified
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Build the mobile-first pull UI
  - [x] 9.1 Implement the 3D chest with reduced-motion fallback
    - Create `components/chest/Chest3D.tsx` (`"use client"`, `react-three-fiber`) that
      emits the `Rarity_Color` during charge-up before opening (highest tier drives batch
      color), and `components/chest/ChestReducedMotion.tsx` static fallback selected when
      `prefers-reduced-motion` is set
    - _Requirements: 2.2, 7.1, 7.3_

  - [x]* 9.2 Write unit tests for reduced-motion selection and color mapping
    - Test `RARITY_COLOR` mapping and reduced-motion fallback selection
    - _Requirements: 2.2, 7.3_

  - [x] 9.3 Implement pull controls with in-progress lock
    - Create `components/pull/PullControls.tsx` (`"use client"`) with 1x / 10x buttons
      (>=44px tap targets, `min-h-11 min-w-11`) that POST to `/api/pull`, show a pending
      state, and prevent overlapping requests (single-flight)
    - _Requirements: 2.1, 3.1, 7.2, 7.4_

  - [x]* 9.4 Write unit tests for tap-target size and single-flight lock
    - **Property 13: In-progress single-flight lock**
    - **Validates: Requirements 7.4, 7.2**

  - [x] 9.5 Implement result reveal
    - Create `components/pull/ResultReveal.tsx` (`"use client"`) that shows the
      `Rarity_Color` before revealing idea content for single and batch results
    - _Requirements: 2.2_

  - [x] 9.6 Assemble the pull screen shell
    - Implement `app/page.tsx` (RSC shell) and `app/layout.tsx`, wiring the chest, pull
      controls, and result reveal into a narrow-viewport-first layout that enhances at
      `sm:`/`md:`/`lg:`
    - _Requirements: 7.1, 7.2_

  - [x] 9.7 Implement pull error and retry state
    - Surface an error state in the pull UI for failed requests (including
      `config-error`, `catalog-error`, `internal`) and allow retry, re-enabling controls
      only after the request resolves
    - _Requirements: 8.2_

- [x] 10. Build the history view
  - [x] 10.1 Implement history list and empty state
    - Create `app/history/page.tsx` (RSC reading the user's `Pull_History`),
      `components/history/HistoryList.tsx` (idea content, tier + color, timestamp, ordered
      most-recent-first), and `components/history/EmptyHistory.tsx`
    - _Requirements: 6.1, 6.2, 6.3_

  - [x]* 10.2 Write property test for history ordering
    - **Property 11: History ordering is most-recent-first**
    - **Validates: Requirements 6.2**

  - [x]* 10.3 Write unit test for history rendering completeness and empty state
    - **Property 12: History rendering completeness**
    - **Validates: Requirements 6.1, 6.3**

- [x] 11. Final checkpoint - full flow verified
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional (tests) and can be skipped for a faster MVP.
- Each task references specific requirements for traceability.
- Property tests use `fast-check` with the project's runner (e.g. Vitest), minimum 100
  iterations, tagged **Feature: gacha-idea-generator, Property {number}: ...**.
- All odds/pity/guarantee logic runs server-side; the client never receives raw config
  or the service-role key.
- Checkpoints ensure incremental validation of pure logic, the server pipeline, and the
  full flow.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.3", "2.4", "4.1", "4.3"] },
    { "id": 2, "tasks": ["3.1", "4.2", "4.4", "4.5", "4.6"] },
    { "id": 3, "tasks": ["4.7", "4.8", "6.1"] },
    { "id": 4, "tasks": ["4.9", "4.10", "4.11", "6.2", "6.4"] },
    { "id": 5, "tasks": ["6.3", "6.5", "6.6"] },
    { "id": 6, "tasks": ["6.7", "7.1"] },
    { "id": 7, "tasks": ["7.2", "9.1", "9.3", "9.5"] },
    { "id": 8, "tasks": ["9.2", "9.4", "9.6", "10.1"] },
    { "id": 9, "tasks": ["9.7", "10.2", "10.3"] }
  ]
}
```
