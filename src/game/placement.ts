import { findPiece } from './catalog'
import { addVec, dotVec, DOWN, isSameVec, rotateVec, subtractVec, vecKey, type Vec3 } from './geometry'
import type { KowloonState, Placement } from './types'

/** What a piece occupies once it is turned and put down. */
export interface Footprint {
  cells: Vec3[]
}

export function footprintOf({ pieceId, orientation, origin }: Placement): Footprint {
  const definition = findPiece(pieceId)
  if (!definition) throw new Error(`Unknown piece "${pieceId}"`)
  return { cells: definition.cells.map(cell => addVec(origin, rotateVec(orientation, cell))) }
}

/** Identifies the place a placement fills, so two ways of turning a symmetrical piece compare equal. */
export function footprintKey(placement: Placement): string {
  return footprintOf(placement).cells.map(vecKey).sort().join(';')
}

/** Pieces can be stacked this many cubes high; a limit on the table, not a rule of the game. */
export const MAX_HEIGHT = 12

/** What a new piece has to fit around. */
export interface BuiltTable {
  tableSize: number
  /** The vecKey of every cube on the table. */
  occupied: ReadonlySet<string>
  /** The highest occupied y, or -1 when nothing is built. */
  topY: number
  /** The extent of the table and everything built, as the lowest and highest x and z. */
  bounds: { min: readonly [number, number]; max: readonly [number, number] }
}

export function builtTableOf(state: Pick<KowloonState, 'tableSize' | 'pieces'>): BuiltTable {
  const footprints = state.pieces.map(footprintOf)
  const cells = footprints.flatMap(footprint => footprint.cells)
  const xs = cells.map(cell => cell[0])
  const zs = cells.map(cell => cell[2])
  return {
    tableSize: state.tableSize,
    occupied: new Set(cells.map(vecKey)),
    topY: Math.max(-1, ...cells.map(cell => cell[1])),
    bounds: {
      min: [Math.min(0, ...xs), Math.min(0, ...zs)],
      max: [Math.max(state.tableSize - 1, ...xs), Math.max(state.tableSize - 1, ...zs)],
    },
  }
}

function isOverTable([x, , z]: Vec3, tableSize: number): boolean {
  return x >= 0 && x < tableSize && z >= 0 && z < tableSize
}

export interface Support {
  /** The cubes (or table squares) the piece rests on, one per bottom face. */
  contacts: Vec3[]
  /** How many bottom faces hang over nothing. */
  airFaces: number
}

/** What the bottom faces of `candidate` rest on: a building cube, the table, or air. */
export function supportOf(table: BuiltTable, candidate: Footprint): Support {
  const cellKeys = new Set(candidate.cells.map(vecKey))
  const contacts: Vec3[] = []
  let airFaces = 0
  for (const cell of candidate.cells) {
    const below = addVec(cell, DOWN)
    if (cellKeys.has(vecKey(below))) continue
    const isResting = below[1] < 0 ? isOverTable(cell, table.tableSize) : table.occupied.has(vecKey(below))
    if (isResting) contacts.push(below)
    else airFaces++
  }
  return { contacts, airFaces }
}

/**
 * Why `candidate` can't be put down on the table as it is, or null if it can. This is the shape's
 * own rules, whatever card goes with it:
 *
 * - It must stay between the table top and the height limit, and not overlap anything.
 * - It may overhang the table's edge or a building, but only if more of its bottom faces rest on
 *   the table or a building than hang in the air.
 */
export function placementProblem(table: BuiltTable, candidate: Footprint): string | null {
  if (!candidate.cells.every(([, y]) => y >= 0 && y < MAX_HEIGHT)) return `Keep the piece between the table top and ${MAX_HEIGHT} cubes high.`
  if (candidate.cells.some(cell => table.occupied.has(vecKey(cell)))) return 'That space is already taken.'

  const { contacts, airFaces } = supportOf(table, candidate)
  if (contacts.length === 0) return 'Rest it on the table or on a building.'
  if (contacts.length <= airFaces) return 'Too much of it hangs in the air: more of its bottom must rest on the tower than overhang.'
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
