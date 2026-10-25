import type { CardTable } from './cards/cardTable'
import type { CardId } from './cards/catalog'
import type { Vec3 } from './geometry'
import type { ResourceCount } from './resources'
import type { PlacedToken } from './tokens'

export interface KowloonSettings {
  /** The table is tableSize × tableSize cells. */
  tableSize: number
  /** Whether matches play with three of the four resources or all four. */
  resourceCount: ResourceCount
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

/** How many of each piece a seat has left, by piece id. */
export type PieceSupply = Record<string, number>

export interface KowloonState {
  tableSize: number
  resourceCount: ResourceCount
  seatCount: number
  pieces: PlacedPiece[]
  /** Whose turn it is. */
  playerIndex: number
  nextPieceId: number
  cards: CardTable
  /** One per seat. */
  supplies: PieceSupply[]
  tokens: PlacedToken[]
  /** Each seat's score, kept by hand: nothing scores automatically yet. */
  points: number[]
  /** The seeded generator's state; see GameKit's nextRandom. */
  randomState: number
}

export type KowloonMove =
  /** The active player's whole turn: a card from their hand with a piece from their supply. */
  | ({ kind: 'play'; cardId: CardId } & Placement)
  /** Passes the turn; only when no card and piece can be played together. */
  | { kind: 'pass' }
  | { kind: 'adjust_points'; seat: number; delta: number }
