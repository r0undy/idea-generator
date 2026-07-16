-- Migration: Row Level Security policies for Gacha Idea Generator
-- Enables RLS on project_ideas, pull_history, user_pity_state, and drop_rate_config,
-- and defines per-table access policies per design.md's "Data Models" section.
--
-- Requirements: 1.4, 5.5

-- project_ideas: authenticated select only, no client writes (seeded server-side)
alter table public.project_ideas enable row level security;

create policy "project_ideas_select_authenticated"
  on public.project_ideas
  for select
  to authenticated
  using (true);

-- pull_history: user_id = auth.uid() for select/insert/update
alter table public.pull_history enable row level security;

create policy "pull_history_select_own"
  on public.pull_history
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "pull_history_insert_own"
  on public.pull_history
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "pull_history_update_own"
  on public.pull_history
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- user_pity_state: user_id = auth.uid() for select/insert/update
alter table public.user_pity_state enable row level security;

create policy "user_pity_state_select_own"
  on public.user_pity_state
  for select
  to authenticated
  using (user_id = auth.uid());

create policy "user_pity_state_insert_own"
  on public.user_pity_state
  for insert
  to authenticated
  with check (user_id = auth.uid());

create policy "user_pity_state_update_own"
  on public.user_pity_state
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- drop_rate_config: no client-accessible policy (service-role only).
-- RLS is enabled with no policies for authenticated/anon roles, so the
-- Postgres RLS default-deny applies to all client-issued requests. Only the
-- service-role key (which bypasses RLS) can read/write this table.
alter table public.drop_rate_config enable row level security;
