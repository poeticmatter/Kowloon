import { nextIndex } from 'game-kit/turns'
import { vecKey, type Vec3 } from './geometry'
import type { Resource } from './resources'

// Resource tokens are flat squares lying on the top face of a cube, or on a square of the bare
// table (the cube layer just under the table top, y = -1). Playing a building uses up the tokens
// it sits on and lays its output on its own uncovered top faces.

export interface PlacedToken {
  resource: Resource
  /** The cube whose top face the token lies on. */
  square: Vec3
}

/** The y of the cube layer just under the table top: the squares of the bare table. */
export const TABLE_SQUARE_Y = -1

interface Scattered {
  tokens: PlacedToken[]
  randomState: number
}

/** One random token on every square of the bare table, drawn from the game's seeded generator. */
export function scatterTokens(tableSize: number, resources: readonly Resource[], randomState: number): Scattered {
  const tokens: PlacedToken[] = []
  let state = randomState
  for (let x = 0; x < tableSize; x++) {
    for (let z = 0; z < tableSize; z++) {
      const { index, nextState } = nextIndex(state, resources.length)
      state = nextState
      tokens.push({ resource: resources[index], square: [x, TABLE_SQUARE_Y, z] })
    }
  }
  return { tokens, randomState: state }
}

export function tokensBySquare(tokens: readonly PlacedToken[]): Map<string, PlacedToken> {
  return new Map(tokens.map(token => [vecKey(token.square), token]))
}
