import { PIECE_SIZES } from './catalog'

// A seat's polycubes are counted by size: the shape is chosen when the piece is built. Every
// piece starts unready except a couple of cubes; taking or combining makes one ready, and
// building spends it.

/** How many pieces of each size, indexed by size - 1. */
export type SizeCounts = readonly number[]

/** How many pieces of each size a seat has in all. */
export const PIECES_PER_SIZE: SizeCounts = [6, 4, 3, 3, 3]

/** The pieces a seat starts with ready. */
export const STARTING_READY: SizeCounts = [2, 0, 0, 0, 0]

export function isPieceSize(value: unknown): value is number {
  return typeof value === 'number' && PIECE_SIZES.includes(value)
}

export function countOf(counts: SizeCounts, size: number): number {
  return counts[size - 1] ?? 0
}

export function withCount(counts: SizeCounts, size: number, delta: number): SizeCounts {
  return counts.map((count, index) => (index === size - 1 ? count + delta : count))
}

/** Counts the sizes in a list, e.g. [1, 1, 2] is two of size 1 and one of size 2. */
export function countSizes(sizes: readonly number[]): SizeCounts {
  return PIECE_SIZES.map(size => sizes.filter(candidate => candidate === size).length)
}

/** Whether `counts` has at least as many of every size as `needed`. */
export function hasAtLeast(counts: SizeCounts, needed: SizeCounts): boolean {
  return needed.every((count, index) => (counts[index] ?? 0) >= count)
}

export function startingSupply(): { ready: SizeCounts; unready: SizeCounts } {
  return { ready: STARTING_READY, unready: PIECES_PER_SIZE.map((count, index) => count - STARTING_READY[index]) }
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
