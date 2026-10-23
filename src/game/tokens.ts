import { addVec, isSameVec, subtractVec, UP, vecKey, type Vec3 } from './geometry'
import type { AimTarget } from './placement'
import type { Resource } from './resources'

// Resource tokens are flat squares laid on the top face of a building's cube, one per square.
// The supply is endless: the sandbox doesn't count them.

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

/** The square a pointer aimed at, if it pointed at the top face of a cube (not the table or a side). */
export function squareUnder(target: AimTarget): Vec3 | null {
  if (!isSameVec(target.normal, UP)) return null
  const square = subtractVec(target.cell, UP)
  return square[1] < 0 ? null : square
}
