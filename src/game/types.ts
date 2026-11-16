import type { CardId } from './cards/catalog'
import type { Market } from './cards/market'
import type { Vec3 } from './geometry'
import type { ShapeCounts } from './supply'

export interface KowloonSettings {
  /** The table is tableSize × tableSize cells. */
  tableSize: number
}

/** Which piece, turned which way, with its pivot cell where. */
export interface Placement {
  pieceId: string
  /** Index into the 24 rotations in geometry.ts. */
  orientation: number
  /** The cell the piece's pivot occupies. */
  origin: Vec3
}

export interface PlacedPiece extends Placement {
  id: number
  /** The seat that built it; it is drawn in that seat's colour. */
  owner: number
}

/** What one seat has: polycubes in its colour, the cards that make its engine, and its points. */
export interface SeatState {
  /** Pieces that can be built now, counted by shape. */
  ready: ShapeCounts
  /** Pieces still to be taken or combined, counted by shape. */
  unready: ShapeCounts
  /** The cards built so far, oldest first. Everyone can see them. */
  tableau: CardId[]
  /** Points scored by effects; the cards' sizes are added at the end. */
  points: number
}

export interface KowloonState {
  tableSize: number
  seatCount: number
  pieces: PlacedPiece[]
  /** Whose turn it is. */
  playerIndex: number
  nextPieceId: number
  market: Market
  /** One per seat. */
  seats: SeatState[]
  /** Set when someone has met an end condition; the round is then played out. */
  isEndTriggered: boolean
  isOver: boolean
  /** The seeded generator's state; see GameKit's nextRandom. */
  randomState: number
}

export type KowloonMove =
  /** Builds a card from the market with a ready piece of its size, putting the piece on the table. */
  | ({ kind: 'build'; cardId: CardId } & Placement)
  /** Readies a size 1 piece, or the next size up if none is left. */
  | { kind: 'take' }
  /** Returns ready pieces (by shape) to ready one piece of shape `pieceId`. */
  | { kind: 'combine'; returned: string[]; pieceId: string }
  /** Passes the turn; only when nothing else can be done. */
  | { kind: 'pass' }
