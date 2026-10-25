import { nextIndex } from 'game-kit/turns'
import { addVec, isSameVec, subtractVec, UP, vecKey, type Vec3 } from './geometry'
import type { AimTarget } from './placement'
import { RESOURCES, type Resource } from './resources'

// Resource tokens are flat squares laid on the top face of a building's cube, one per square.
// The supply is endless: the sandbox doesn't count them. A token doesn't stop a building going on
// top of it; it stays underneath, hidden, and shows again if that building is taken back.

export interface PlacedToken {
  resource: Resource
  /** The building cube the token lies on top of. */
  square: Vec3
}

export function tokenAt(tokens: readonly PlacedToken[], square: Vec3): PlacedToken | undefined {
  return tokens.find(token => isSameVec(token.square, square))
}

/**
 * Why a token can't go on `square`, or null if it can.
 * `builtCells` holds the vecKey of every cube on the table.
 */
export function tokenPlacementProblem(builtCells: ReadonlySet<string>, tokens: readonly PlacedToken[], square: Vec3): string | null {
  if (!builtCells.has(vecKey(square))) return 'Tokens go on top of a building.'
  if (builtCells.has(vecKey(addVec(square, UP)))) return 'That square is covered by another cube.'
  if (tokenAt(tokens, square)) return 'That square already has a token.'
  return null
}

/** The y of the cubes' layer just under the table top: the squares of the bare table. */
const TABLE_SQUARE_Y = -1

interface Scattered {
  tokens: PlacedToken[]
  randomState: number
}

/** One random token on every square of the bare table, drawn from the game's seeded generator. */
export function scatterTokens(tableSize: number, randomState: number): Scattered {
  const tokens: PlacedToken[] = []
  let state = randomState
  for (let x = 0; x < tableSize; x++) {
    for (let z = 0; z < tableSize; z++) {
      const { index, nextState } = nextIndex(state, RESOURCES.length)
      state = nextState
      tokens.push({ resource: RESOURCES[index], square: [x, TABLE_SQUARE_Y, z] })
    }
  }
  return { tokens, randomState: state }
}

/** The square a pointer aimed at, if it pointed at an upward face: a cube's top, or a square of the bare table. */
export function squareUnder(target: AimTarget): Vec3 | null {
  if (!isSameVec(target.normal, UP)) return null
  return subtractVec(target.cell, UP)
}
