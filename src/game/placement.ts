import { findPiece } from './catalog'
import { addVec, dotVec, DOWN, isSameVec, rotateVec, subtractVec, vecKey, type Vec3 } from './geometry'
import type { PlacedToken } from './tokens'
import { tokensBySquare } from './tokens'
import type { KowloonState, Placement } from './types'

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

/** Pieces can be stacked this many cubes high; a limit on the table, not a rule of the game. */
export const MAX_HEIGHT = 12

/** What a new piece has to fit around. */
export interface BuiltTable {
  tableSize: number
  /** The vecKey of every cube on the table. */
  occupied: ReadonlySet<string>
  /** The vecKey of every cell in front of a window, which must stay empty. */
  windowFronts: ReadonlySet<string>
  /** The tokens, by the vecKey of the cube (or table square) they lie on. */
  tokens: ReadonlyMap<string, PlacedToken>
  /** The highest occupied y, or -1 when nothing is built. */
  topY: number
  /** The extent of the table and everything built, as the lowest and highest x and z. */
  bounds: { min: readonly [number, number]; max: readonly [number, number] }
}

export function builtTableOf(state: Pick<KowloonState, 'tableSize' | 'pieces' | 'tokens'>): BuiltTable {
  const footprints = state.pieces.map(footprintOf)
  const cells = footprints.flatMap(footprint => footprint.cells)
  const xs = cells.map(cell => cell[0])
  const zs = cells.map(cell => cell[2])
  return {
    tableSize: state.tableSize,
    occupied: new Set(cells.map(vecKey)),
    windowFronts: new Set(footprints.flatMap(footprint => footprint.windows.map(window => vecKey(windowFront(window))))),
    tokens: tokensBySquare(state.tokens),
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
 * - A window needs the cube in front of it empty, so nothing may touch it there. That holds both
 *   for the new piece's windows and for the windows of pieces already placed. A window can't face
 *   the table itself either.
 * - It may overhang the table's edge or a building, but only if more of its bottom faces rest on
 *   the table or a building than hang in the air.
 */
export function placementProblem(table: BuiltTable, candidate: Footprint): string | null {
  const candidateKeys = new Set(candidate.cells.map(vecKey))

  if (!candidate.cells.every(([, y]) => y >= 0 && y < MAX_HEIGHT)) return `Keep the piece between the table top and ${MAX_HEIGHT} cubes high.`
  if (candidate.cells.some(cell => table.occupied.has(vecKey(cell)))) return 'That space is already taken.'

  for (const window of candidate.windows) {
    const front = windowFront(window)
    if (front[1] < 0 && isOverTable(front, table.tableSize)) return 'A window can’t face the table.'
    if (table.occupied.has(vecKey(front))) return 'A window of this piece would be covered.'
  }
  if ([...candidateKeys].some(key => table.windowFronts.has(key))) return 'This piece would cover a window.'

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
