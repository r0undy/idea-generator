-- Migration: RLS/index performance fixes for Gacha Idea Generator
-- Applied via Supabase MCP directly against the hosted project
-- (zvbsldbawgbkfmiiatyn); mirrored here to keep the local migrations
-- directory in sync with the hosted source of truth.
--
-- Addresses two advisor findings after the initial schema/RLS/RPC/seed
-- migrations were applied:
-- 1. auth_rls_initplan (WARN): auth.uid() was being re-evaluated per row in
--    pull_history/user_pity_state policies. Wrapping it in (select ...)
--    lets Postgres evaluate it once per query instead.
-- 2. unindexed_foreign_keys (INFO): pull_history.idea_id and
--    pull_history.user_id had no covering index.

drop policy "pull_history_select_own" on public.pull_history;
create policy "pull_history_select_own"
  on public.pull_history
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy "pull_history_insert_own" on public.pull_history;
create policy "pull_history_insert_own"
  on public.pull_history
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy "pull_history_update_own" on public.pull_history;
create policy "pull_history_update_own"
  on public.pull_history
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy "user_pity_state_select_own" on public.user_pity_state;
create policy "user_pity_state_select_own"
  on public.user_pity_state
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy "user_pity_state_insert_own" on public.user_pity_state;
create policy "user_pity_state_insert_own"
  on public.user_pity_state
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy "user_pity_state_update_own" on public.user_pity_state;
create policy "user_pity_state_update_own"
  on public.user_pity_state
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create index if not exists pull_history_idea_id_idx on public.pull_history (idea_id);
create index if not exists pull_history_user_id_idx on public.pull_history (user_id);
