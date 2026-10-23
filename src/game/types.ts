import type { CardTable, CardZone } from './cards/cardTable'
import type { CardId } from './cards/catalog'
import type { Vec3 } from './geometry'

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
  /** The seat that built it; its colour follows the seat's current colour. */
  owner: number
}

export interface KowloonState {
  tableSize: number
  seatCount: number
  pieces: PlacedPiece[]
  /** Whose turn it is. */
  playerIndex: number
  /** How far the table's colours have been rotated; see seatAppearance. */
  colorShift: number
  nextPieceId: number
  /** Ids of the pieces the active player has placed so far this turn, oldest first. */
  placedThisTurn: number[]
  cards: CardTable
  /** Each seat's score, kept by hand: nothing in the sandbox scores automatically. */
  points: number[]
  /** The seeded generator's state; see GameKit's nextRandom. */
  randomState: number
}

export type KowloonMove =
  | ({ kind: 'place' } & Placement)
  /** Takes back the piece placed most recently this turn. */
  | { kind: 'undo_place' }
  | { kind: 'rotate_colors' }
  | { kind: 'end_turn' }
  | { kind: 'shuffle_deck' }
  /** Moves a card the active player can reach to the end of a zone; "hand" is their own hand. */
  | { kind: 'move_card'; cardId: CardId; to: CardZone }
  | { kind: 'adjust_points'; seat: number; delta: number }
