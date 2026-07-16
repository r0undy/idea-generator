-- Migration: PRD fields on project_ideas + reseed the catalog
--
-- Adds the structured fields used to generate a downloadable, Kiro-style spec
-- (PRD) per idea, and reseeds the catalog with fresh, beginner-friendly ideas
-- that are ALL fullstack apps built on Supabase (Auth + Postgres, some Realtime
-- / Storage).
--
-- Reseed strategy is non-destructive: existing rows are referenced by
-- pull_history via a foreign key, so we do NOT delete them. Instead we retire
-- them (is_active = false) so the draw stops selecting them, and insert the new
-- ideas as active. lib/pull/service.ts filters on is_active = true.

-- 1. New columns (all defaulted so existing rows remain valid).
alter table public.project_ideas
  add column if not exists tagline      text    not null default '',
  add column if not exists features     jsonb   not null default '[]'::jsonb,
  add column if not exists data_model   jsonb   not null default '[]'::jsonb,
  add column if not exists stretch_goals jsonb  not null default '[]'::jsonb,
  add column if not exists is_active    boolean not null default true;

-- 2. Retire the previous catalog (kept for pull_history FK integrity).
update public.project_ideas set is_active = false;

-- 3. Reseed. Every idea is a fullstack Supabase app.

-- COMMON: focused, weekend-scale fullstack apps.
insert into public.project_ideas
  (title, tagline, description, rarity_tier, features, data_model, stretch_goals)
values
  ('Bookmark Vault',
   'Save links, tag them, find them fast.',
   'A personal bookmarking app where a signed-in user saves links with a title, notes, and tags, then searches and filters their collection.',
   'common',
   '["Add a bookmark with URL, title, and notes","Tag bookmarks and filter by tag","Full-text search across titles and notes","Mark favorites and sort by most recent"]'::jsonb,
   '[{"name":"bookmarks","purpose":"One row per saved link: url, title, notes, is_favorite, user_id."},{"name":"tags","purpose":"Reusable tag labels owned by a user."},{"name":"bookmark_tags","purpose":"Join table linking bookmarks to tags."}]'::jsonb,
   '["Import bookmarks from a browser HTML export","Auto-fetch the page title and favicon on paste"]'::jsonb),

  ('Gratitude Journal',
   'One good thing a day, kept private.',
   'A private daily journal where the user writes short gratitude entries and browses past days on a calendar.',
   'common',
   '["Write a dated journal entry","One entry per day with edit support","Calendar view of entries by month","Random past entry resurfacer"]'::jsonb,
   '[{"name":"entries","purpose":"Dated journal text per user, unique on (user_id, entry_date)."}]'::jsonb,
   '["Daily email or push reminder","Mood tag per entry with a simple trend view"]'::jsonb),

  ('Flashcard Study Deck',
   'Build decks, then drill them.',
   'A spaced-study flashcard app: users create decks of question and answer cards and run a study session that flips through them.',
   'common',
   '["Create and rename decks","Add front/back cards to a deck","Study mode that flips cards one at a time","Track cards marked known vs needs review"]'::jsonb,
   '[{"name":"decks","purpose":"A named deck owned by a user."},{"name":"cards","purpose":"Front and back text belonging to a deck, with a review status."}]'::jsonb,
   '["Simple spaced-repetition scheduling","Share a read-only deck via a public link"]'::jsonb),

  ('Habit Streak Tracker',
   'Check in daily, keep the streak alive.',
   'A habit tracker where users define habits and tap to check them off each day, with a running streak count per habit.',
   'common',
   '["Create habits with a name and color","Daily check-in toggle per habit","Current and longest streak per habit","Month grid showing completed days"]'::jsonb,
   '[{"name":"habits","purpose":"A habit definition owned by a user."},{"name":"habit_checkins","purpose":"One row per habit per completed date."}]'::jsonb,
   '["Weekly summary view","Reminder notifications for unchecked habits"]'::jsonb),

  ('Movie Watchlist',
   'Track what to watch and what you loved.',
   'A watchlist app for movies and shows: add titles, move them between to-watch and watched, and leave a rating and quick review.',
   'common',
   '["Add a title with year and poster URL","Move items between to-watch and watched","Rate watched titles from 1 to 5","Filter by status and sort by rating"]'::jsonb,
   '[{"name":"watchlist_items","purpose":"A title with status, rating, and review, owned by a user."}]'::jsonb,
   '["Search a public movie API to autofill details","Share a public watched list"]'::jsonb),

  ('Plant Watering Reminder',
   'Never forget to water again.',
   'A plant-care app where users add their plants with a watering interval and mark each as watered, seeing which plants are due.',
   'common',
   '["Add a plant with name, photo, and watering interval","Mark a plant as watered today","Dashboard of plants due today or overdue","Watering history per plant"]'::jsonb,
   '[{"name":"plants","purpose":"A plant with a watering interval and last-watered date, owned by a user."},{"name":"waterings","purpose":"A log of watering events per plant."}]'::jsonb,
   '["Photo upload via Supabase Storage","Due-today reminder notifications"]'::jsonb),

  ('Quick Poll Maker',
   'Ask a question, share a link, watch votes land.',
   'A lightweight polling app: a signed-in user creates a poll with options, shares a link, and anyone with the link can vote once.',
   'common',
   '["Create a poll with a question and 2 to 6 options","Share a poll via a unique link","Cast a vote and see live percentages","Prevent duplicate voting per visitor"]'::jsonb,
   '[{"name":"polls","purpose":"A poll question owned by a creator, with a public slug."},{"name":"poll_options","purpose":"An answer option belonging to a poll."},{"name":"votes","purpose":"A vote for an option, keyed to prevent duplicates."}]'::jsonb,
   '["Realtime result updates as votes arrive","Close a poll at a set time"]'::jsonb),

  ('Reading List',
   'Your books, their status, your notes.',
   'A reading tracker where users add books, set a status of to-read, reading, or finished, and keep notes and a rating per book.',
   'common',
   '["Add a book with title, author, and cover","Set reading status per book","Add notes and a rating when finished","Filter by status and search by title or author"]'::jsonb,
   '[{"name":"books","purpose":"A book with status, rating, and notes, owned by a user."}]'::jsonb,
   '["Reading goal for the year with progress","Public shelf page"]'::jsonb);

-- RARE: medium-complexity fullstack apps.
insert into public.project_ideas
  (title, tagline, description, rarity_tier, features, data_model, stretch_goals)
values
  ('Split-the-Bill Groups',
   'Shared expenses, settled fairly.',
   'A group expense splitter: users create a group, add shared expenses paid by different members, and see who owes whom.',
   'rare',
   '["Create a group and invite members by email","Add an expense with payer and split among members","Per-member running balance within a group","Suggested settle-up transfers to zero out balances"]'::jsonb,
   '[{"name":"groups","purpose":"An expense group owned by a creator."},{"name":"group_members","purpose":"Membership linking users to groups."},{"name":"expenses","purpose":"An expense with amount, payer, and group."},{"name":"expense_shares","purpose":"Each member''s share of an expense."}]'::jsonb,
   '["Uneven or percentage-based splits","Export a group''s history to CSV"]'::jsonb),

  ('Realtime Team Retro Board',
   'Run a retro where the board updates live.',
   'A sprint retrospective board with columns like Went Well, To Improve, and Actions. Cards and votes sync live across everyone in the room.',
   'rare',
   '["Create a board with named columns","Add and edit cards in any column","Upvote cards to prioritize them","Live updates across all connected members via Supabase Realtime"]'::jsonb,
   '[{"name":"boards","purpose":"A retro board owned by a creator, joinable by link."},{"name":"columns","purpose":"An ordered column belonging to a board."},{"name":"cards","purpose":"A card with text and vote count in a column."},{"name":"card_votes","purpose":"A vote by a member on a card."}]'::jsonb,
   '["Anonymous card mode","Timer and phase control for the facilitator"]'::jsonb),

  ('Recipe Box with Meal Planner',
   'Keep recipes, plan the week, build a shopping list.',
   'A recipe manager where users store recipes with ingredients and steps, then drag recipes onto a weekly calendar to plan meals.',
   'rare',
   '["Save recipes with ingredients and steps","Assign recipes to days on a weekly plan","Auto-generate a shopping list from the week","Search recipes by title or ingredient"]'::jsonb,
   '[{"name":"recipes","purpose":"A recipe with steps, owned by a user."},{"name":"ingredients","purpose":"Ingredient lines belonging to a recipe."},{"name":"meal_plan_entries","purpose":"A recipe assigned to a date for a user."}]'::jsonb,
   '["Scale ingredient quantities by servings","Share a recipe via a public link"]'::jsonb),

  ('Job Application Tracker',
   'Every application, every stage, no dropped balls.',
   'A tracker for job hunts: applications move through stages from applied to offer or rejected, with notes and follow-up reminders.',
   'rare',
   '["Add an application with company, role, and link","Move applications through stages","Add notes and a next-follow-up date","Board or list view grouped by stage"]'::jsonb,
   '[{"name":"applications","purpose":"An application with company, role, stage, and follow-up date, owned by a user."},{"name":"application_notes","purpose":"Timestamped notes on an application."}]'::jsonb,
   '["Reminder notifications for due follow-ups","Simple funnel stats by stage"]'::jsonb),

  ('Community Q&A Board',
   'Ask, answer, and upvote the best.',
   'A question-and-answer board where signed-in users post questions, answer others, and vote answers up so the best rises to the top.',
   'rare',
   '["Post a question with tags","Answer a question","Upvote questions and answers","Accept one answer as the solution"]'::jsonb,
   '[{"name":"questions","purpose":"A question with title, body, and tags, by an author."},{"name":"answers","purpose":"An answer to a question, by an author."},{"name":"votes","purpose":"A user vote on a question or answer."}]'::jsonb,
   '["Full-text search over questions","Reputation points per user"]'::jsonb),

  ('Event RSVP and Guest List',
   'Create an event, collect RSVPs, know your headcount.',
   'An event page builder: hosts create an event with details, share a link, and guests RSVP yes, no, or maybe with a headcount.',
   'rare',
   '["Create an event with date, place, and description","Share a public RSVP link","Guests RSVP with a status and plus-ones","Host dashboard with live headcount"]'::jsonb,
   '[{"name":"events","purpose":"An event owned by a host, with a public slug."},{"name":"rsvps","purpose":"A guest response with status and party size for an event."}]'::jsonb,
   '["Email confirmation to guests","Waitlist when capacity is reached"]'::jsonb),

  ('Freelance Invoice Log',
   'Track clients, invoices, and what is still unpaid.',
   'A simple invoicing log for freelancers: manage clients, create line-item invoices, and track paid versus outstanding totals.',
   'rare',
   '["Manage a client list","Create an invoice with line items","Mark invoices as sent or paid","Dashboard of outstanding and paid totals"]'::jsonb,
   '[{"name":"clients","purpose":"A client owned by a user."},{"name":"invoices","purpose":"An invoice for a client with status and dates."},{"name":"invoice_items","purpose":"Line items belonging to an invoice."}]'::jsonb,
   '["Generate a printable invoice page","Recurring monthly invoices"]'::jsonb);

-- SUPER_RARE: ambitious but still beginner-approachable fullstack apps.
insert into public.project_ideas
  (title, tagline, description, rarity_tier, features, data_model, stretch_goals)
values
  ('Realtime Multiplayer Quiz',
   'Join a room, answer fast, top the live leaderboard.',
   'A live quiz game: a host starts a room, players join with a code, questions are timed, and a leaderboard updates in real time.',
   'super_rare',
   '["Host creates a quiz and starts a room with a join code","Players join and answer timed questions","Scores update live via Supabase Realtime","Final leaderboard at the end of the round"]'::jsonb,
   '[{"name":"quizzes","purpose":"A quiz owned by a host, with questions."},{"name":"questions","purpose":"A timed question with options and a correct answer."},{"name":"rooms","purpose":"A live game session with a join code and state."},{"name":"players","purpose":"A player in a room with a running score."},{"name":"answers","purpose":"A player''s answer to a question with timing."}]'::jsonb,
   '["Speed-based scoring bonus","Reconnect handling if a player drops"]'::jsonb),

  ('Collaborative Kanban with Presence',
   'A shared board where you see teammates working live.',
   'A Kanban board multiple people edit together: cards move between columns in real time and you can see who else is online and where.',
   'super_rare',
   '["Create boards with ordered columns","Add, edit, and move cards between columns","Realtime sync of card moves across members","Live presence showing who is online"]'::jsonb,
   '[{"name":"boards","purpose":"A board owned by a creator, shared with members."},{"name":"board_members","purpose":"Membership linking users to boards."},{"name":"columns","purpose":"An ordered column in a board."},{"name":"cards","purpose":"A card with position and column, synced in realtime."}]'::jsonb,
   '["Card assignees and due dates","Activity feed of recent changes"]'::jsonb),

  ('Credit-based Mini Marketplace',
   'List items, spend in-app credits, no real money.',
   'A closed marketplace using in-app credits instead of real payments: users list items, buy with credits, and credits transfer atomically.',
   'super_rare',
   '["List an item with title, price in credits, and photo","Browse and search active listings","Buy an item, transferring credits atomically","Wallet with balance and transaction history"]'::jsonb,
   '[{"name":"listings","purpose":"An item for sale in credits, by a seller."},{"name":"wallets","purpose":"A per-user credit balance."},{"name":"orders","purpose":"A purchase linking buyer, seller, and listing."},{"name":"credit_transactions","purpose":"A ledger of credit movements for auditability."}]'::jsonb,
   '["Photo upload via Supabase Storage","A Postgres function for the atomic buy transaction"]'::jsonb),

  ('Habit Accountability Buddies',
   'Pair up and keep each other honest.',
   'A habit app with a social twist: users pair with a buddy, share a shared goal, and each gets notified when the other checks in or slips.',
   'super_rare',
   '["Create a shared goal and invite a buddy","Daily check-ins visible to both buddies","Notifications when a buddy checks in or misses","Shared streak that both must maintain"]'::jsonb,
   '[{"name":"goals","purpose":"A shared goal linking two buddies."},{"name":"goal_members","purpose":"The two participants in a goal."},{"name":"checkins","purpose":"A daily check-in by a member for a goal."},{"name":"notifications","purpose":"Buddy activity alerts per user."}]'::jsonb,
   '["Push or email notifications","Weekly recap message to both buddies"]'::jsonb),

  ('Mini Social Feed',
   'Follow people, post updates, read your timeline.',
   'A small social app: users post short updates, follow others, and see a timeline composed of the people they follow.',
   'super_rare',
   '["Post short text updates","Follow and unfollow other users","Personalized timeline of followed users","Like posts and see like counts"]'::jsonb,
   '[{"name":"profiles","purpose":"A public profile per user."},{"name":"posts","purpose":"A short update authored by a user."},{"name":"follows","purpose":"A follower-to-followed relationship."},{"name":"likes","purpose":"A like by a user on a post."}]'::jsonb,
   '["Realtime timeline updates","Image posts via Supabase Storage"]'::jsonb);
