-- Migration: Atomic pull persistence RPC for Gacha Idea Generator
-- Adds record_pull(p_user_id, p_items, p_new_pity), a single Postgres function
-- that inserts pull_history rows and upserts user_pity_state in one
-- transaction, per design.md's "Atomic persistence (Postgres RPC)" section.
--
-- Requirements: 2.3, 3.3, 4.1, 8.1
--
-- Security model:
-- This function runs with `security invoker` (the default), so it executes
-- with the privileges of the calling role (the authenticated user via the
-- anon-key + session client), NOT the function owner. This means the
-- existing RLS policies on pull_history ("user_id = auth.uid()" for insert)
-- and user_pity_state ("user_id = auth.uid()" for insert/update) are still
-- enforced for every row this function writes — the function gains no
-- special bypass privileges. We additionally assert `p_user_id = auth.uid()`
-- explicitly at the top of the function so a caller can never pass another
-- user's id and get a clear, function-level rejection before hitting RLS.
--
-- `security definer` was intentionally NOT used here: it would run the
-- function as the function owner (bypassing RLS for its body), which would
-- require re-implementing the "own rows only" check entirely inside the
-- function to avoid becoming a privilege-escalation vector for arbitrary
-- pull_history/user_pity_state writes. Since Pull_Service always calls this
-- RPC through the session-aware (anon key + user cookies) Supabase client
-- (see lib/supabase/server.ts's createClient()), the invoking role already
-- is the authenticated user — so `security invoker` + the auth.uid() guard
-- gives defense-in-depth (function check + RLS) with no bypass surface.
create or replace function public.record_pull(
  p_user_id uuid,
  p_items jsonb,
  p_new_pity int
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item jsonb;
begin
  -- Defense in depth: reject outright if the caller is not the user they
  -- claim to be writing history/pity for. RLS would reject the underlying
  -- inserts/updates anyway, but this gives an explicit, early error.
  if p_user_id is distinct from auth.uid() then
    raise exception 'record_pull: p_user_id must match the authenticated user';
  end if;

  if p_new_pity < 0 then
    raise exception 'record_pull: p_new_pity must be >= 0';
  end if;

  -- Insert one pull_history row per awarded item. jsonb_array_elements
  -- iterates p_items, which must be a JSON array of objects each shaped
  -- like { "idea_id": uuid, "rarity_tier": text }.
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    insert into public.pull_history (user_id, idea_id, rarity_tier)
    values (
      p_user_id,
      (v_item ->> 'idea_id')::uuid,
      v_item ->> 'rarity_tier'
    );
  end loop;

  -- Upsert the user's pity counter to the new value computed by the caller.
  insert into public.user_pity_state (user_id, pity_counter, updated_at)
  values (p_user_id, p_new_pity, now())
  on conflict (user_id)
  do update set
    pity_counter = excluded.pity_counter,
    updated_at = excluded.updated_at;
end;
$$;

-- Allow authenticated users to call the RPC (the function body itself still
-- enforces p_user_id = auth.uid() and is subject to RLS on the tables it
-- writes, since it runs with security invoker).
grant execute on function public.record_pull(uuid, jsonb, int) to authenticated;
