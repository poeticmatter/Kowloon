# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # dev server at http://localhost:3000
npm run lint       # TypeScript type checking (tsc --noEmit)
npm test           # vitest
npm run build      # production build
npm run deploy     # build and publish to GitHub Pages
npm run init-game -- <repo-name> <game-id> "<Title>"   # one-time rename of a fresh template copy
```

## Architecture

Kowloon: a 3D game for 2–5 players taking turns in order, building towers out of polycubes on a shared table, with no backend of its own. It is part of the game lab (poeticmatter/game-lab), created from poeticmatter/game-template-turns.

**Current stage: first draft of the rules** (the earlier sandbox, where players moved cards and tokens by hand, is the git tag `toy`). On their turn a player plays one card from their hand of five with one building from their supply (two of each piece). The card names three input resources; the building must rest directly on those tokens (on the table squares or on the top faces of buildings below), which are used up. The building then lays the card's output token on each open top face without a window. The player draws a card and play passes. A building may overhang the table or a building only if more of its bottom faces rest on the tower than hang in the air. Points are still adjusted by hand; there is no end of game yet.

The multiplayer platform (lobby, seats, transports, status screens) is **GameKit**'s `game-kit/turns`, a package pinned in `package.json` to a release tag of poeticmatter/GameKit (local copy: `C:\Code\GameKit`).

- `src/game/`: the game, with `index.ts` exporting `game: GameModule`.
  - Pure and tested: `geometry.ts` (integer vectors, the 24 proper rotations, camera-relative axes), `catalog.ts` (the pieces: tetracubes; the five that lie flat have a window on each flat side), `placement.ts` (footprints, support, and `placementProblem`, the rules about the shape alone), `play.ts` (a card with a building: the inputs under it, the outputs on it, and the search for every valid placement), `resources.ts` (fish = Food, cog = Parts, wifi = Data, users = Workers; a match uses three or four), `tokens.ts` (resource tokens on cube tops and the bare table), `rules.ts`, `screenCommands.ts` (turn/move commands from the viewer's seat).
  - UI: `Board.tsx`, `PieceTray.tsx` (the viewer's supply), `PlacementControls.tsx`, `SeatBar.tsx`, `PointsHud.tsx` (each seat's points, adjusted by hand), `ViewModeBar.tsx` + `viewModes.ts` (realistic / helpful / complete / computational: how much the board reveals about valid placements; a per-browser choice, not game state), `useValidPlacements.ts` (the search, summarised for the current pick), `ResourceIcon.tsx` (Lucide icons for the resources), `usePlacementDraft.ts` (the piece being lined up before it's committed), `usePlacementKeys.ts`.
  - `cards/`: `catalog.ts` (the cards, transcribed from tenth_dragon_cards_v5.csv: three inputs and one output; with three kinds of token the missing resource is swapped for another), `cardTable.ts` (deck, a hand per seat, a discard pile showing only its last card; seeded shuffle, dealing and drawing), `CardsView.tsx` (the hand, deck and discard).
  - `scene/`: three.js. `TableScene.ts` owns the renderer, camera, orbit controls and pointer raycasting; `pieceMeshes.ts` builds a piece's cubes and porthole windows; `tokenMeshes.ts` draws the tokens (Lucide SVGs onto canvas textures); `thumbnails.ts` draws the tray pictures.
- Lattice: y is up; the table spans x and z in `[0, tableSize)` with its top at y = 0. A cell's cube spans `[x, x+1]` on each axis.
- Mirror images are never produced: only the 24 proper rotations exist, so chiral pieces (the two screws) are separate catalog entries.
- `src/game.config.ts`: `GAME_CONFIG`: the game id, title, tagline, and Supabase settings read from `.env.local`.
- `src/App.tsx`: renders `<TurnBasedGameApp config={GAME_CONFIG} game={game} />`. GameKit routes on the URL (`?room=CODE[&mode=async]`); solo playtests have no URL.
- `src/index.css`: Tailwind, GameKit's theme (`game-kit/theme.css`), and any colour token overrides.

### Rules contract

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Keep randomness in the game state, seeded from `seed`, and draw with GameKit's `nextIndex` / `nextRandom`, so every client gets the same results.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; GameKit only applies moves from the active player.
- Hands are hidden by the UI only: the state is shared, so every browser holds every hand and the deck order.
- `applyMove` throws GameKit's `IllegalMoveError` for a move that breaks the rules; GameKit catches it and leaves the state alone.
- Taking back moves is GameKit's: a player's moves stay on their screen, undoable, until they send the turn. The `play` move passes play to the next seat, so GameKit's End turn is available straight after it; `pass` does the same, but only when no card can be played with any building.

### Seats and transports (in GameKit)

- Seats fill in join order; the creator is seat 0. Browsers remember their seat per room; anyone with the link can take back a seat ("That's me") or watch.
- **Async (Supabase)**: one row per room in `<game-id>_games` (`players`, `player_count`, `state`, `version`), with seats claimed through `<game-id>_claim_seat`. Both are defined in `supabase/migrations/`.
- **Live (PeerJS)**: the creator hosts and runs the rules; the game ends if the host closes the tab.
- **Solo playtest**: one tester plays every seat of several tables, dealt a random seat each turn. The Board gets `seating: 'solo_playtest'` and `role` is the dealt seat, which GameKit disguises as seat 0 while shuffling the other seats' colours, so the tester always plays the same colour. The Board draws every seat colour as `SEAT_COLORS[lookOf(seat)]` (`appearanceOf` in `Board.tsx`) and lists seats from the viewer's own, never in seat order.

## Rules

- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep `GAME_CONFIG.id` and the table and function names in `supabase/migrations/` in sync.
- To change platform behaviour, change GameKit, tag a release, and bump the `game-kit` version in `package.json`. Don't patch `node_modules/game-kit`.
