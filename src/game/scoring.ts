import { cardsOf } from './cards/catalog'
import { findPiece, PIECE_SIZES } from './catalog'
import { countOf, PIECES_PER_SIZE } from './supply'
import type { PlacedPiece, SeatState } from './types'

// The game ends when a seat has built this many of its largest pieces, or every piece smaller
// than that; the round is then finished so every seat has had the same number of turns.
export const END_LARGEST_BUILT = 3
const LARGEST_SIZE = PIECE_SIZES[PIECE_SIZES.length - 1]

/** What a seat's cards are worth: the sum of their sizes. */
export function cardsScore(seat: SeatState): number {
  return cardsOf(seat.tableau).reduce((total, card) => total + card.size, 0)
}

export function scoreOf(seat: SeatState): number {
  return cardsScore(seat) + seat.points
}

/** How many pieces of each size `seat` has built, indexed by size - 1. */
export function builtCounts(pieces: readonly PlacedPiece[], seat: number): number[] {
  const sizes = pieces.flatMap(piece => (piece.owner === seat ? (findPiece(piece.pieceId)?.size ?? []) : []))
  return PIECE_SIZES.map(size => sizes.filter(candidate => candidate === size).length)
}

/** Whether `seat` has built enough to end the game. */
export function hasMetEndCondition(pieces: readonly PlacedPiece[], seat: number): boolean {
  const built = builtCounts(pieces, seat)
  const hasBuiltLargest = countOf(built, LARGEST_SIZE) >= END_LARGEST_BUILT
  const hasBuiltAllSmaller = PIECE_SIZES.filter(size => size < LARGEST_SIZE).every(size => countOf(built, size) >= countOf(PIECES_PER_SIZE, size))
  return hasBuiltLargest || hasBuiltAllSmaller
}

/** The seats with the highest score; more than one when they tie. */
export function winnersOf(seats: readonly SeatState[]): number[] {
  const best = Math.max(...seats.map(scoreOf))
  return seats.flatMap((seat, index) => (scoreOf(seat) === best ? index : []))
}
