-- Migration: Seed the project_ideas catalog and default drop_rate_config
-- Inserts curated project ideas covering all three rarity tiers so every
-- required tier has entries, and seeds drop_rate_config with the default
-- odds (79 / 18 / 3) per design.md's "Data Models" section.
--
-- Requirements: 5.3, 8.3

-- drop_rate_config defaults: common 79%, rare 18%, super_rare 3%
insert into public.drop_rate_config (tier, probability)
values
  ('common', 79),
  ('rare', 18),
  ('super_rare', 3)
on conflict (tier) do update set probability = excluded.probability;

-- project_ideas: common tier - small, simple, weekend-scale ideas
insert into public.project_ideas (title, description, rarity_tier)
values
  ('Markdown Scratchpad',
   'A single-page note app that saves Markdown to local storage and renders a live preview side-by-side.',
   'common'),
  ('Unit Converter',
   'A small utility that converts between units (length, weight, temperature) with a clean, keyboard-friendly form.',
   'common'),
  ('Pomodoro Timer',
   'A focus timer with work/break intervals, desktop notifications, and a running tally of completed sessions.',
   'common'),
  ('Random Quote Generator',
   'Fetches and displays a random quote from a public API, with a button to copy or share the current quote.',
   'common'),
  ('Color Palette Picker',
   'Lets a user pick a base color and generates a matching palette (complementary, analogous, triadic) with hex codes.',
   'common'),
  ('Habit Tracker Grid',
   'A calendar-style grid where users check off daily habits, with a streak counter per habit.',
   'common'),
  ('QR Code Generator',
   'Takes any text or URL input and renders a downloadable QR code image.',
   'common'),
  ('Expense Splitter',
   'Splits a shared bill between a group of people, handling uneven contributions and rounding.',
   'common'),
  ('Weather Widget',
   'Shows current weather and a short forecast for a searched city using a public weather API.',
   'common'),
  ('Typing Speed Test',
   'Presents random passages to type and measures words-per-minute and accuracy at the end.',
   'common');

-- project_ideas: rare tier - medium-complexity ideas
insert into public.project_ideas (title, description, rarity_tier)
values
  ('Kanban Board with Drag-and-Drop',
   'A multi-column task board with drag-and-drop cards, persisted state, and per-card labels and due dates.',
   'rare'),
  ('Recipe Manager with Meal Planning',
   'Stores recipes with ingredients and steps, and lets users assign recipes to a weekly meal-planning calendar.',
   'rare'),
  ('URL Shortener with Click Analytics',
   'Generates short links and tracks click counts, referrers, and timestamps for each shortened URL.',
   'rare'),
  ('Real-Time Collaborative Whiteboard',
   'A shared canvas where multiple connected users can draw and see each other''s cursors update live.',
   'rare'),
  ('Personal Finance Dashboard',
   'Imports transactions from a CSV, categorizes spending, and renders interactive charts of trends over time.',
   'rare'),
  ('Multiplayer Trivia Game',
   'A room-based trivia game where players join with a code, answer timed questions, and see a live leaderboard.',
   'rare'),
  ('Job Application Tracker',
   'Tracks applications through stages (applied, interviewing, offer, rejected) with reminders for follow-ups.',
   'rare');

-- project_ideas: super_rare tier - ambitious, impressive ideas
insert into public.project_ideas (title, description, rarity_tier)
values
  ('Distributed Task Scheduler',
   'A cron-like scheduler that distributes jobs across worker nodes, with retries, backoff, and failure alerting.',
   'super_rare'),
  ('Self-Hosted Video Conferencing App',
   'A WebRTC-based video chat app with screen sharing, room recording, and adaptive bitrate for poor connections.',
   'super_rare'),
  ('Multiplayer Game Engine with Rollback Netcode',
   'A 2D game engine implementing client-side prediction and rollback for smooth, low-latency multiplayer.',
   'super_rare'),
  ('End-to-End Encrypted Chat Platform',
   'A messaging app implementing client-side key generation and encryption so the server never sees plaintext.',
   'super_rare'),
  ('Infrastructure-as-Code Visual Editor',
   'A drag-and-drop editor that generates and diffs Terraform/CloudFormation configs from a visual graph of resources.',
   'super_rare');
