import { findPiece, PIECES, PIECE_SIZES } from './catalog'
import type { CardDefinition } from './cards/catalog'
import { ROTATION_COUNT, DOWN, addVec, vecKey } from './geometry'
import { footprintKey, footprintOf, MAX_HEIGHT, placementProblem, type BuiltTable, type Footprint } from './placement'
import { countOf, type SizeCounts } from './supply'
import type { PlacedPiece, Placement } from './types'

// Building a card: a ready piece of the card's size (one size smaller for each shrink the player
// has) goes on the table, and the card goes to the player's tableau.

/** The sizes of piece that can be built with `card`, given how many shrinks the player has. */
export function allowedPieceSizes(card: CardDefinition, shrinkCount: number): number[] {
  return PIECE_SIZES.filter(size => size <= card.size && size >= card.size - shrinkCount)
}

/** Why the piece can't be built with `card`, or null if its size suits. */
export function sizeProblem(card: CardDefinition, pieceId: string, shrinkCount: number): string | null {
  const piece = findPiece(pieceId)
  if (!piece) return `Unknown piece "${pieceId}"`
  if (allowedPieceSizes(card, shrinkCount).includes(piece.size)) return null
  const smallest = Math.max(1, card.size - shrinkCount)
  const wanted = smallest === card.size ? `a size ${card.size} piece` : `a piece of size ${smallest} to ${card.size}`
  return `${card.name} is built with ${wanted}, not size ${piece.size}.`
}

/** Why `card` can't be built with the piece at `placement`, or null if it can. */
export function buildProblem(table: BuiltTable, placement: Placement, card: CardDefinition, shrinkCount: number): string | null {
  return sizeProblem(card, placement.pieceId, shrinkCount) ?? placementProblem(table, footprintOf(placement))
}

/**
 * The seats, other than the builder's, whose pieces the new piece rests directly on, nearest
 * seat after the builder first. Each seat appears once, however many of its pieces are covered.
 */
export function coveredSeats(pieces: readonly PlacedPiece[], footprint: Footprint, builder: number, seatCount: number): number[] {
  const ownerAt = new Map(pieces.flatMap(piece => footprintOf(piece).cells.map(cell => [vecKey(cell), piece.owner] as const)))
  const covered = new Set(footprint.cells.flatMap(cell => ownerAt.get(vecKey(addVec(cell, DOWN))) ?? []))
  return Array.from({ length: seatCount - 1 }, (_, offset) => (builder + 1 + offset) % seatCount).filter(seat => covered.has(seat))
}

const SEARCH_MARGIN = 3

/** The orientations of a piece that give different shapes, as indexes into the 24 rotations. */
function distinctOrientations(pieceId: string): number[] {
  const seen = new Set<string>()
  const orientations: number[] = []
  for (let orientation = 0; orientation < ROTATION_COUNT; orientation++) {
    const key = footprintKey({ pieceId, orientation, origin: [0, 0, 0] })
    if (seen.has(key)) continue
    seen.add(key)
    orientations.push(orientation)
  }
  return orientations
}

const orientationsByPiece = new Map<string, number[]>(PIECES.map(piece => [piece.id, distinctOrientations(piece.id)]))

/** Every way the given pieces can be put down on the table. */
export function* placementOptions(table: BuiltTable, pieceIds: readonly string[]): Generator<Placement> {
  const { min, max } = table.bounds
  const highest = Math.min(MAX_HEIGHT - 1, table.topY + SEARCH_MARGIN + 1)
  for (const pieceId of pieceIds) {
    for (const orientation of orientationsByPiece.get(pieceId) ?? []) {
      for (let x = min[0] - SEARCH_MARGIN; x <= max[0] + SEARCH_MARGIN; x++) {
        for (let z = min[1] - SEARCH_MARGIN; z <= max[1] + SEARCH_MARGIN; z++) {
          for (let y = 0; y <= highest; y++) {
            const placement: Placement = { pieceId, orientation, origin: [x, y, z] }
            if (placementProblem(table, footprintOf(placement)) === null) yield placement
          }
        }
      }
    }
  }
}

/** The ids of the pieces of the given sizes. */
export function pieceIdsOfSizes(sizes: readonly number[]): string[] {
  return PIECES.filter(piece => sizes.includes(piece.size)).map(piece => piece.id)
}

/** Whether any of `cards` can be built with some ready piece somewhere on the table. */
export function hasAnyBuild(table: BuiltTable, ready: SizeCounts, cards: readonly CardDefinition[], shrinkCount: number): boolean {
  const buildableSizes = PIECE_SIZES.filter(size => countOf(ready, size) > 0 && !placementOptions(table, pieceIdsOfSizes([size])).next().done)
  return cards.some(card => allowedPieceSizes(card, shrinkCount).some(size => buildableSizes.includes(size)))
}
