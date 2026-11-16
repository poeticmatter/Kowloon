import { PIECE_SIZES, PIECES } from './catalog'

// A seat's polycubes are specific shapes: each shape has a few copies, all *unready* except a
// couple of cubes. Taking or combining makes one ready, and building spends it.

/** How many pieces of each size, indexed by size - 1. */
export type SizeCounts = readonly number[]

/** How many pieces of each shape, by piece id; a missing shape has none. */
export type ShapeCounts = Readonly<Record<string, number>>

/** How many pieces of each size a seat has in all. */
export const PIECES_PER_SIZE: SizeCounts = PIECE_SIZES.map(size => PIECES.filter(piece => piece.size === size).reduce((total, piece) => total + piece.quota, 0))

/** The pieces a seat starts with ready. */
const STARTING_READY: ShapeCounts = { cube: 2 }

export function countOf(counts: SizeCounts, size: number): number {
  return counts[size - 1] ?? 0
}

/** Counts the sizes in a list, e.g. [1, 1, 2] is two of size 1 and one of size 2. */
export function countSizes(sizes: readonly number[]): SizeCounts {
  return PIECE_SIZES.map(size => sizes.filter(candidate => candidate === size).length)
}

export function shapeCount(counts: ShapeCounts, pieceId: string): number {
  return counts[pieceId] ?? 0
}

export function withShape(counts: ShapeCounts, pieceId: string, delta: number): ShapeCounts {
  return { ...counts, [pieceId]: shapeCount(counts, pieceId) + delta }
}

/** The same pieces counted by size instead of shape. */
export function sizeCountsOf(counts: ShapeCounts): SizeCounts {
  return PIECE_SIZES.map(size => PIECES.filter(piece => piece.size === size).reduce((total, piece) => total + shapeCount(counts, piece.id), 0))
}

/** The first shape of this size, in catalog order, that `counts` has any of. */
export function firstShapeOfSize(counts: ShapeCounts, size: number): string | null {
  return PIECES.find(piece => piece.size === size && shapeCount(counts, piece.id) > 0)?.id ?? null
}

export function startingSupply(): { ready: ShapeCounts; unready: ShapeCounts } {
  const ready = Object.fromEntries(PIECES.map(piece => [piece.id, shapeCount(STARTING_READY, piece.id)]))
  const unready = Object.fromEntries(PIECES.map(piece => [piece.id, piece.quota - shapeCount(STARTING_READY, piece.id)]))
  return { ready, unready }
}

/**
 * The sizes of pieces that add up to `sum` (at least two, each smaller than `target`) and that
 * `ready` can supply, or null if it can't. Prefers the fewest pieces.
 */
export function findPiecesAddingTo(ready: SizeCounts, sum: number, target: number): number[] | null {
  let best: number[] | null = null
  const search = (size: number, remaining: number, chosen: number[]) => {
    if (remaining === 0) {
      if (chosen.length >= 2 && (best === null || chosen.length < best.length)) best = chosen
      return
    }
    if (size < 1) return
    for (let used = Math.min(countOf(ready, size), Math.floor(remaining / size)); used >= 0; used--) {
      search(size - 1, remaining - used * size, [...chosen, ...Array<number>(used).fill(size)])
    }
  }
  search(target - 1, sum, [])
  return best
}
