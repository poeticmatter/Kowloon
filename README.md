# Kowloon

A 3D game for 2–5 players, part of the [game lab](https://poeticmatter.github.io/game-lab/). Players take turns building the walled city out of polycube towers on a shared table.

Play: https://poeticmatter.github.io/Kowloon/ (async, live or hot seat).

## Current stage: sandbox

- Every piece is a four-cube building with one or two porthole windows, in its owner's colour.
- Pieces turn in quarter turns about any axis, never into their mirror image.
- Placement is enforced: on the table, touching another piece face to face, and never covering a window (the cube in front of a window must stay empty, and no window may face the table).
- Nothing else is automated: no costs, no effects. Place as many pieces as you like, take back this turn's pieces, then end your turn.
- Colours can be rotated between players; the camera turns to each player's side of the table.

### Controls

Drag to orbit, scroll or pinch to zoom. Pick a building in the tray and aim it with the mouse (click to place) or tap to aim and press **Place**.

| Keys | |
|---|---|
| A / D | spin left / right |
| W / S | tip away / towards you |
| Q / E | roll left / right |
| Arrows, R / F | move the piece; raise / lower |
| Enter | place |

## Development

Built from [game-template-turns](https://github.com/poeticmatter/game-template-turns) on [GameKit](https://github.com/poeticmatter/GameKit); see `CLAUDE.md`.

```bash
npm run dev      # http://localhost:3000
npm run lint
npm test
npm run deploy
```
