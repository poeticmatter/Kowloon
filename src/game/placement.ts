import { findPiece } from './catalog'
import { addVec, dotVec, isSameVec, rotateVec, subtractVec, vecKey, type Vec3 } from './geometry'
import type { KowloonState, Placement } from './types'

/** Pieces can be stacked this many cubes high; a limit on the table, not a rule of the game. */
export const MAX_HEIGHT = 12

export interface WorldWindow {
  /** The cube the window sits on. */
  cell: Vec3
  /** The direction it faces. */
  normal: Vec3
}

/** What a piece occupies once it is turned and put down. */
export interface Footprint {
  cells: Vec3[]
  windows: WorldWindow[]
}

export function footprintOf({ pieceId, orientation, origin }: Placement): Footprint {
  const definition = findPiece(pieceId)
  if (!definition) throw new Error(`Unknown piece "${pieceId}"`)
  const cells = definition.cells.map(cell => addVec(origin, rotateVec(orientation, cell)))
  const windows = definition.windows.map(({ cell, normal }) => ({ cell: cells[cell], normal: rotateVec(orientation, normal) }))
  return { cells, windows }
}

/** The cube in front of a window, which a window needs to stay empty. */
export function windowFront({ cell, normal }: WorldWindow): Vec3 {
  return addVec(cell, normal)
}

/** Pieces may overhang the table's edges, but nothing goes below the table top or above the height limit. */
function isWithinHeight([, y]: Vec3): boolean {
  return y >= 0 && y < MAX_HEIGHT
}

/** What a new piece has to fit around. */
export interface BuiltTable {
  placed: readonly Footprint[]
}

export function builtTableOf(state: KowloonState): BuiltTable {
  return { placed: state.pieces.map(footprintOf) }
}

/**
 * Why `candidate` can't be put down next to the pieces already on the table, or null if it can.
 *
 * - It may overhang the table's edges but must not overlap anything.
 * - A window needs the cube in front of it empty, so nothing may touch it there. That holds both
 *   for the new piece's windows and for the windows of pieces already placed.
 */
export function placementProblem({ placed }: BuiltTable, candidate: Footprint): string | null {
  const occupied = new Set(placed.flatMap(footprint => footprint.cells.map(vecKey)))
  const candidateKeys = new Set(candidate.cells.map(vecKey))

  if (!candidate.cells.every(isWithinHeight)) return `Keep the piece between the table top and ${MAX_HEIGHT} cubes high.`
  if (candidate.cells.some(cell => occupied.has(vecKey(cell)))) return 'That space is already taken.'

  for (const window of candidate.windows) {
    const front = windowFront(window)
    if (front[1] < 0) return 'A window can’t face the table.'
    if (occupied.has(vecKey(front))) return 'A window of this piece would be covered.'
  }
  const coversExistingWindow = placed.some(footprint => footprint.windows.some(window => candidateKeys.has(vecKey(windowFront(window)))))
  if (coversExistingWindow) return 'This piece would cover a window.'
  return null
}

/** Where a pointer is aiming: the empty cell it points at, and the way the surface it touched faces. */
export interface AimTarget {
  cell: Vec3
  normal: Vec3
}

export function isSameAim(a: AimTarget, b: AimTarget): boolean {
  return isSameVec(a.cell, b.cell) && isSameVec(a.normal, b.normal)
}

/**
 * The origin that puts the piece's side facing the surface (the cubes furthest against `normal`)
 * onto `target.cell`, so a piece aimed at the table rests on it instead of sinking in.
 * Among those cubes, the one nearest the pivot lands on the target.
 */
export function originForAim(placement: Omit<Placement, 'origin'>, target: AimTarget): Vec3 {
  const definition = findPiece(placement.pieceId)
  if (!definition) throw new Error(`Unknown piece "${placement.pieceId}"`)
  const turned = definition.cells.map(cell => rotateVec(placement.orientation, cell))
  const depthOf = (cell: Vec3) => dotVec(cell, target.normal)
  const distanceFromPivot = (cell: Vec3) => Math.abs(cell[0]) + Math.abs(cell[1]) + Math.abs(cell[2])
  const contact = turned.reduce((best, cell) => {
    if (depthOf(cell) !== depthOf(best)) return depthOf(cell) < depthOf(best) ? cell : best
    return distanceFromPivot(cell) < distanceFromPivot(best) ? cell : best
  })
  return subtractVec(target.cell, contact)
}
