# Turn-Based Game Template

The starting point for games in the [game lab](https://poeticmatter.github.io/game-lab/) where **2–5 players take turns in order**. For two-player games where both choose secretly at the same time, use [game-template](https://github.com/poeticmatter/game-template) instead.

You get, from [GameKit](https://github.com/poeticmatter/GameKit) (`game-kit/turns`):

- **Async play** backed by Supabase: take your turn whenever you like; players join with a link and a name, and can take their seat back on another device
- **Live play** over PeerJS (peer to peer, no server), with spectators and reconnection
- **Hot seat**: everyone shares one device
- A lobby with a player count, share links, a "Your turn" tab title, and GitHub Pages deployment

The example game in `src/game/` is Pig, a push-your-luck dice game. Replace it with your own.

## Starting a new game

1. On GitHub, click **Use this template → Create a new repository** (for example `poeticmatter/TownHall`), then clone it.
2. Name the game:
   ```bash
   npm install
   npm run init-game -- TownHall townhall "Town Hall"
   ```
   This sets the Pages path, the title, and the game id. The game id names the Supabase table (`townhall_games`) and seat-claim function (`townhall_claim_seat`), and it prefixes the PeerJS room ids and localStorage keys so lab games never collide.
3. Apply the renamed migration in `supabase/migrations/` to the shared Supabase project.
4. Copy `.env.local` from any other lab game (every game uses the same Supabase project).
5. Replace `src/game/` with your game, update this README, then run `npm run deploy`.
6. Add the game to the hub's `games.json` in [poeticmatter/game-lab](https://github.com/poeticmatter/game-lab).

## Structure

```
src/
├── game.config.ts   # GAME_CONFIG: game id, title, tagline, Supabase settings
├── game/            # THE GAME: replace this folder
│   ├── index.ts     #   exports `game: GameModule`
│   ├── rules.ts     #   pure, deterministic createInitialState / activePlayer / applyMove
│   ├── rules.test.ts
│   ├── Board.tsx    #   renders state, calls onMove
│   ├── SettingsForm.tsx
│   └── seatColors.ts
├── index.css        # Tailwind, GameKit's theme, and any colour overrides
└── App.tsx          # <TurnBasedGameApp config={GAME_CONFIG} game={game} />
```

The lobby, seats, transports and status screens live in GameKit, pinned in `package.json` to a release tag. To change them, change GameKit, tag a release, and bump the version here.

### The game contract

A game provides a `GameModule` (types from `game-kit/turns`):

- `rules.createInitialState({ settings, playerCount, seed })`, `rules.activePlayer(state)` and `rules.applyMove(state, move)`. These must be **pure and deterministic**: in async play the moving player's client computes the next state and everyone else trusts it. Keep randomness in the state, seeded from `seed`, and draw with GameKit's `nextIndex` (Pig's dice do this).
- `activePlayer` names the seat (0-based) whose move the game awaits, or `null` once it's over. A turn can take several moves; only the active player's are applied.
- `applyMove` throws `IllegalMoveError` for a move that breaks the rules. Boards should only offer legal moves; the error guards against stale or tampered ones.
- `Board` receives `state`, `role` (a seat number or `'spectator'`), `players` (names, in seat order), `onMove` and `seating`. In hot seat, `seating` is `'hot_seat'` and `role` is always the active player, so name players rather than saying "You".
- `minPlayers`, `maxPlayers`, `playerAppearance(seat)` (a name and colour for the lobby and join screens), `defaultSettings` and `SettingsForm` (which also gets the chosen player count).

GameKit's screens take their colours from the tokens in `src/index.css`.

## Commands

```bash
npm run dev      # http://localhost:3000
npm run lint     # tsc --noEmit
npm test         # vitest
npm run build
npm run deploy   # build and publish to GitHub Pages (gh-pages branch)
```
