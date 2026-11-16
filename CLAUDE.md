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

**Current stage: second draft of the rules** (earlier stages are the git tag `toy` and the commit `First draft of the rules`). Inspired by Barenpark and Gizmos. Polycubes come in sizes 1 to 5. Each seat has its own pool of specific shapes: 7 cubes, 3 dominoes, 2 each of the two size 3 shapes, and 1 of each of the eight size 4 and six size 5 shapes. All are *unready* except two cubes; ready and unready are counted per shape, and a build uses one of the shapes the seat has ready. Size 5 pieces are neutral (drawn grey), so covering them triggers nothing. On their turn a player does one of: **build** (pick a card from the market, a face-up row per size, and a ready polycube of the card's size; the piece goes on the shared table and the card into the player's tableau, their engine), **take** (ready a size 1 piece, or the next size up if none is left; effects that ready a piece do the same) or **combine** (return ready pieces to ready a specific bigger shape, the pieces adding up to its size). Each action sets off the player's cards with that trigger: `build`, `covered` (once per other seat whose pieces the new piece rests directly on), `take`, `combine`. Effects (points, ready a piece of a size, free combine) can set off more triggers; a card fires at most once per action, and a newly built card doesn't fire for its own build. Passives: `shrink` (build a card with a piece one size smaller) and `combineBonus` (combine into one size bigger). The game ends once a seat has built 3 size 5 pieces or all its pieces smaller than that; the round is then finished. Score is the total size of a seat's cards plus its effect points. A piece may overhang the table or a piece only if more of its bottom faces rest on the tower than hang in the air.

The multiplayer platform (lobby, seats, transports, status screens) is **GameKit**'s `game-kit/turns`, a package pinned in `package.json` to a release tag of poeticmatter/GameKit (local copy: `C:\Code\digital-board-games\GameKit`).

- `src/game/`: the game, with `index.ts` exporting `game: GameModule`.
  - Pure and tested: `geometry.ts` (integer vectors, the 24 proper rotations, camera-relative axes), `catalog.ts` (the pieces, sizes 1 to 5), `supply.ts` (a seat's pieces counted by shape, ready or not, and the search for pieces that combine), `placement.ts` (footprints, support, and `placementProblem`, the rules about the shape alone), `play.ts` (which pieces a card allows, what a new piece covers, and the search for every valid placement), `effects.ts` (resolving triggers and their chains), `scoring.ts` (scores and the end condition), `rules.ts`, `screenCommands.ts` (turn/move commands from the viewer's seat).
  - UI: `Board.tsx`, `PolycubePool.tsx` (the viewer's shapes as pictures in three zones: Ready, Combine and Not yet; click or drag to pick a shape to build, set pieces aside, take or combine), `PlacementControls.tsx`, `SeatBar.tsx`, `ScoreHud.tsx` (scores and tableaux), `PlacementNavigator.tsx` (steps the ghost through the valid placements of the picked pair), `ViewModeBar.tsx` + `viewModes.ts` (realistic / helpful / complete / computational: how much the board reveals about valid placements; a per-browser choice, not game state), `useValidPlacements.ts` (the search, summarised for the current pick), `usePlacementDraft.ts` (the piece being lined up before it's committed), `usePlacementKeys.ts`.
  - `cards/`: `catalog.ts` (the cards: a size, and a triggered effect or a passive), `describe.ts` (a card's text), `market.ts` (a row per size, with a seeded deck behind it), `MarketView.tsx`, `CardButton.tsx`.
  - `scene/`: three.js. `TableScene.ts` owns the renderer, camera, orbit controls and pointer raycasting; `pieceMeshes.ts` builds a piece's cubes; `thumbnails.ts` draws the tray pictures.
- Lattice: y is up; the table spans x and z in `[0, tableSize)` with its top at y = 0. A cell's cube spans `[x, x+1]` on each axis.
- Mirror images are never produced: only the 24 proper rotations exist, so chiral pieces (the two screws) are separate catalog entries.
- `src/game.config.ts`: `GAME_CONFIG`: the game id, title, tagline, and Supabase settings read from `.env.local`.
- `src/App.tsx`: renders `<TurnBasedGameApp config={GAME_CONFIG} game={game} />`. GameKit routes on the URL (`?room=CODE[&mode=async]`); solo playtests have no URL.
- `src/index.css`: Tailwind, GameKit's theme (`game-kit/theme.css`), and any colour token overrides.

### Rules contract

- `createInitialState({ settings, playerCount, seed })` and `applyMove(state, move)` must be pure and deterministic. Keep randomness in the game state, seeded from `seed`, and draw with GameKit's `nextIndex` / `nextRandom`, so every client gets the same results.
- `activePlayer(state)` names the seat whose move the game awaits (null once over). A turn may take several moves; GameKit only applies moves from the active player.
- Everything is public except the order of the card decks, which every browser can read from the shared state.
- `applyMove` throws GameKit's `IllegalMoveError` for a move that breaks the rules; GameKit catches it and leaves the state alone.
- Taking back moves is GameKit's: a player's moves stay on their screen, undoable, until they send the turn. Every move (`build`, `take`, `combine`, `pass`) ends the turn, so GameKit's End turn is available straight after it; `pass` is only allowed when the player can do none of the others.

### Seats and transports (in GameKit)

- Seats fill in join order; the creator is seat 0. Browsers remember their seat per room; anyone with the link can take back a seat ("That's me") or watch.
- **Async (Supabase)**: one row per room in `<game-id>_games` (`players`, `player_count`, `state`, `version`), with seats claimed through `<game-id>_claim_seat`. Both are defined in `supabase/migrations/`.
- **Live (PeerJS)**: the creator hosts and runs the rules; the game ends if the host closes the tab.
- **Solo playtest**: one tester plays every seat of several tables, dealt a random seat each turn. The Board gets `seating: 'solo_playtest'` and `role` is the dealt seat, which GameKit disguises as seat 0 while shuffling the other seats' colours, so the tester always plays the same colour. The Board draws every seat colour as `SEAT_COLORS[lookOf(seat)]` (`appearanceOf` in `Board.tsx`) and lists seats from the viewer's own, never in seat order.

## Rules

- All state changes go through `rules.applyMove`. UI components only render state and submit moves.
- Keep `GAME_CONFIG.id` and the table and function names in `supabase/migrations/` in sync.
- To change platform behaviour, change GameKit, tag a release, and bump the `game-kit` version in `package.json`. Don't patch `node_modules/game-kit`.
