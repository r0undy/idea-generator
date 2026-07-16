-- Migration: Gacha Idea Generator catalog and per-user schema
-- Creates project_ideas, pull_history, user_pity_state, and drop_rate_config tables
-- with columns, defaults, check constraints, and foreign keys per design.md's
-- "Data Models" section.
--
-- Requirements: 1.4, 2.3, 4.1, 5.2, 6.1
--
-- NOTE: This migration intentionally does NOT include Row Level Security policies
-- (task 2.2) or seed data (task 2.3).

-- project_ideas: curated catalog, readable by authenticated users
create table if not exists public.project_ideas (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text not null,
  rarity_tier  text not null check (rarity_tier in ('common', 'rare', 'super_rare')),
  created_at   timestamptz not null default now()
);

-- pull_history: per-user record of awarded ideas
create table if not exists public.pull_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id),
  idea_id      uuid not null references public.project_ideas(id),
  rarity_tier  text not null check (rarity_tier in ('common', 'rare', 'super_rare')),
  pulled_at    timestamptz not null default now()
);

-- user_pity_state: per-user pity counter
create table if not exists public.user_pity_state (
  user_id      uuid primary key references auth.users(id),
  pity_counter int not null default 0 check (pity_counter >= 0),
  updated_at   timestamptz not null default now()
);

-- drop_rate_config: server-side, service-role-only tunable drop rates
create table if not exists public.drop_rate_config (
  tier         text primary key check (tier in ('common', 'rare', 'super_rare')),
  probability  int not null
);
