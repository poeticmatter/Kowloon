import type { Vec3 } from './geometry'

/** A polycube. cells[0] is the pivot the piece rotates around. */
export interface PieceDefinition {
  id: string
  name: string
  /** How many cubes it has, which is also the size of the card it is played with. */
  size: number
  cells: readonly Vec3[]
}

export const PIECE_SIZES: readonly number[] = [1, 2, 3, 4, 5]

// The tetracubes: the two screws are mirror images that no rotation turns into each other, so
// they are separate pieces, exactly as two physical blocks would be.
const SHAPES = {
  cube: [[0, 0, 0]],
  domino: [[0, 0, 0], [1, 0, 0]],
  line3: [[0, 0, 0], [1, 0, 0], [-1, 0, 0]],
  corner3: [[0, 0, 0], [1, 0, 0], [0, 0, 1]],
  bar: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [2, 0, 0]],
  square: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1]],
  tee: [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [0, 0, 1]],
  ell: [[0, 0, 0], [-1, 0, 0], [1, 0, 0], [1, 0, 1]],
  skew: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [-1, 0, 1]],
  tripod: [[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]],
  rightScrew: [[0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 1, 1]],
  leftScrew: [[0, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 1, -1]],
  longBar: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [2, 0, 0], [-2, 0, 0]],
  longEll: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [-2, 0, 0], [-2, 0, 1]],
  pee: [[0, 0, 0], [1, 0, 0], [0, 0, 1], [1, 0, 1], [-1, 0, 0]],
  longTee: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, 2]],
  vee: [[0, 0, 0], [1, 0, 0], [2, 0, 0], [0, 0, 1], [0, 0, 2]],
  spur: [[0, 0, 0], [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, 0, 1]],
} as const satisfies Record<string, readonly Vec3[]>

function piece(id: string, name: string, cells: readonly Vec3[]): PieceDefinition {
  return { id, name, size: cells.length, cells }
}

export const PIECES: readonly PieceDefinition[] = [
  piece('cube', 'Cube', SHAPES.cube),
  piece('domino', 'Domino', SHAPES.domino),
  piece('line3', 'Line', SHAPES.line3),
  piece('corner3', 'Corner', SHAPES.corner3),
  piece('bar', 'Bar (I)', SHAPES.bar),
  piece('square', 'Square (O)', SHAPES.square),
  piece('tee', 'Tee (T)', SHAPES.tee),
  piece('ell', 'Ell (L)', SHAPES.ell),
  piece('skew', 'Skew (S)', SHAPES.skew),
  piece('tripod', 'Tripod', SHAPES.tripod),
  piece('right-screw', 'Right screw', SHAPES.rightScrew),
  piece('left-screw', 'Left screw', SHAPES.leftScrew),
  piece('long-bar', 'Long bar', SHAPES.longBar),
  piece('long-ell', 'Long ell', SHAPES.longEll),
  piece('pee', 'Pee (P)', SHAPES.pee),
  piece('long-tee', 'Long tee', SHAPES.longTee),
  piece('vee', 'Vee (V)', SHAPES.vee),
  piece('spur', 'Spur', SHAPES.spur),
]

export function findPiece(id: string): PieceDefinition | undefined {
  return PIECES.find(definition => definition.id === id)
}

export function piecesOfSize(size: number): readonly PieceDefinition[] {
  return PIECES.filter(definition => definition.size === size)
}
