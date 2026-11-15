import type { Vec3 } from './geometry'

/** A tetracube. cells[0] is the pivot the piece rotates around. */
export interface PieceDefinition {
  id: string
  name: string
  cells: readonly Vec3[]
}

// The eight tetracubes. The two screws are mirror images that no rotation turns into each other,
// so they are separate pieces, exactly as two physical blocks would be.
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

export const PIECES: readonly PieceDefinition[] = [
  { id: 'bar', name: 'Bar (I)', cells: SHAPES.bar },
  { id: 'square', name: 'Square (O)', cells: SHAPES.square },
  { id: 'tee', name: 'Tee (T)', cells: SHAPES.tee },
  { id: 'ell', name: 'Ell (L)', cells: SHAPES.ell },
  { id: 'skew', name: 'Skew (S)', cells: SHAPES.skew },
  { id: 'tripod', name: 'Tripod', cells: SHAPES.tripod },
  { id: 'right-screw', name: 'Right screw', cells: SHAPES.rightScrew },
  { id: 'left-screw', name: 'Left screw', cells: SHAPES.leftScrew },
]

export function findPiece(id: string): PieceDefinition | undefined {
  return PIECES.find(definition => definition.id === id)
}
