-- Async play storage for this turn-based game.
--
-- Every game in the lab shares one Supabase project and owns its own table, named
-- `<game-id>_games` (the id is GAME_CONFIG.id in src/game.config.ts), plus a
-- `<game-id>_claim_seat` function. `npm run init-game` renames this file, the table
-- and the function.
--
-- One row per match, keyed by room code. Moves are applied client-side by the active
-- player with the game's pure rules (GameKit's game-kit/turns); this table stores data
-- only:
--
-- * `players` lists who has taken a seat, in seat order, as [{ "name": "…" }]. The
--   game starts once it holds `player_count` entries.
-- * `version` counts applied moves. Each move rewrites `state` and bumps `version`,
--   guarded on the previous value, so a stale or duplicate move matches no row.
--
-- There is no auth: knowing the room code is the access credential, the same trust
-- model as the PeerJS share link. The permissive RLS policies are intentional for
-- playtesting with friends. The Supabase security advisor will flag them; that's expected.

create table if not exists public.template_turns_games (
  id            text primary key,                 -- room code (uppercase)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  settings      jsonb not null,                   -- game settings from the lobby
  player_count  integer not null check (player_count between 2 and 5),
  players       jsonb not null default '[]'::jsonb check (jsonb_typeof(players) = 'array'),
  state         jsonb not null,                   -- authoritative game state
  version       integer not null                  -- applied moves; guards stale writes
);

alter table public.template_turns_games enable row level security;

create policy "anon read"   on public.template_turns_games for select using (true);
create policy "anon insert" on public.template_turns_games for insert with check (true);
create policy "anon update" on public.template_turns_games for update using (true) with check (true);

-- Realtime so players who are online see each move as it happens.
alter publication supabase_realtime add table public.template_turns_games;

-- Seats are claimed here so two people joining at once can't take the same seat: the
-- update re-checks the seat count under the row lock. Returns the claimed seat
-- (0-based), or null when the room is full or doesn't exist.
create or replace function public.template_turns_claim_seat(room_id text, player_name text)
returns integer
language sql
set search_path = ''
as $$
  update public.template_turns_games
     set players = players || jsonb_build_array(jsonb_build_object('name', left(btrim(player_name), 24))),
         updated_at = now()
   where id = room_id
     and jsonb_array_length(players) < player_count
  returning jsonb_array_length(players) - 1;
$$;

grant execute on function public.template_turns_claim_seat(text, text) to anon, authenticated;
