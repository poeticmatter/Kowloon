import type { Vec3 } from './geometry'

/** A porthole on the outward face of one cube. */
export interface WindowSpec {
  /** Index into the piece's cells. */
  cell: number
  /** The face it sits on, as a unit vector in the piece's own frame. */
  normal: Vec3
}

/** A tetracube with its windows. cells[0] is the pivot the piece rotates around. */
export interface PieceDefinition {
  id: string
  name: string
  cells: readonly Vec3[]
  windows: readonly WindowSpec[]
}

const PX: Vec3 = [1, 0, 0]
const NX: Vec3 = [-1, 0, 0]
const PY: Vec3 = [0, 1, 0]
const NY: Vec3 = [0, -1, 0]
const PZ: Vec3 = [0, 0, 1]
const NZ: Vec3 = [0, 0, -1]

// The eight tetracubes. The five that can lie flat (four cubes in one layer) have a window on
// each flat side; the bar can lie four ways, so it has four. The tripod and the screws can't lie
// flat, so each has two pieces, differing in where their one or two windows go. The two screws are mirror images that no rotation turns into
// each other, so they are separate pieces, exactly as two physical blocks would be.
const SHAPES = {
  bar: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [2, 0, 0]],
  square: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]],
  tee: [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [0, 0, 1]],
  ell: [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 1]],
  skew: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 1]],
  tripod: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
  rightScrew: [[0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 1, 1]],
  leftScrew: [[0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 1, -1]],
} as const satisfies Record<string, readonly Vec3[]>

function piece(id: string, name: string, cells: readonly Vec3[], ...windows: [number, Vec3][]): PieceDefinition {
  return { id, name, cells, windows: windows.map(([cell, normal]) => ({ cell, normal })) }
}

export const PIECES: readonly PieceDefinition[] = [
  piece('bar', 'Bar (I)', SHAPES.bar, [0, PY], [1, PZ], [2, NY], [3, NZ]),
  piece('square', 'Square (O)', SHAPES.square, [0, PY], [3, NY]),
  piece('tee', 'Tee (T)', SHAPES.tee, [3, PY], [1, NY]),
  piece('ell', 'Ell (L)', SHAPES.ell, [1, PY], [3, NY]),
  piece('skew', 'Skew (S)', SHAPES.skew, [1, PY], [3, NY]),
  piece('tripod-peak', 'Tripod, peak', SHAPES.tripod, [2, PY]),
  piece('tripod-legs', 'Tripod, legs', SHAPES.tripod, [1, PX], [3, NY]),
  piece('right-screw-end', 'Right screw, end', SHAPES.rightScrew, [1, NX]),
  piece('right-screw-pair', 'Right screw, pair', SHAPES.rightScrew, [3, PZ], [0, NY]),
  piece('left-screw-end', 'Left screw, end', SHAPES.leftScrew, [1, NX]),
  piece('left-screw-pair', 'Left screw, pair', SHAPES.leftScrew, [3, NZ], [0, NY]),
]

export function findPiece(id: string): PieceDefinition | undefined {
  return PIECES.find(definition => definition.id === id)
}
