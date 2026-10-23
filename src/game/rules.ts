import { IllegalMoveError, type GameRules } from 'game-kit/turns'
import { CARD_ZONES, emptyCardTable, locateCard, shuffleCards, transferCard, type CardZone } from './cards/cardTable'
import { CARDS, isCardId, type CardId } from './cards/catalog'
import { findPiece } from './catalog'
import { isRotationIndex } from './geometry'
import { footprintOf, placementProblem } from './placement'
import type { KowloonMove, KowloonSettings, KowloonState, PlacedPiece, Placement } from './types'
import { SEAT_COLORS } from './seatColors'

// Kowloon, first step: a sandbox. Players take turns placing polycube buildings on the table.
// The rules enforce where a piece may go (on the table, touching another piece, never covering a
// window) and whose turn it is. They never pay for anything or trigger an effect. Cards and
// points work the same way: players move and score them by hand.

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isOrigin(value: unknown): value is Placement['origin'] {
  return Array.isArray(value) && value.length === 3 && value.every(isInteger)
}

function placePiece(state: KowloonState, placement: Placement): KowloonState {
  if (!findPiece(placement.pieceId)) throw new IllegalMoveError(`Unknown piece "${placement.pieceId}"`)
  if (!isRotationIndex(placement.orientation)) throw new IllegalMoveError('Unknown orientation')
  if (!isOrigin(placement.origin)) throw new IllegalMoveError('The origin must be a cell')

  const problem = placementProblem(state.pieces.map(footprintOf), footprintOf(placement), state.tableSize)
  if (problem) throw new IllegalMoveError(problem)

  const piece: PlacedPiece = { ...placement, id: state.nextPieceId, owner: state.playerIndex }
  return {
    ...state,
    pieces: [...state.pieces, piece],
    nextPieceId: state.nextPieceId + 1,
    placedThisTurn: [...state.placedThisTurn, piece.id],
  }
}

function undoPlace(state: KowloonState): KowloonState {
  const lastId = state.placedThisTurn.at(-1)
  if (lastId === undefined) throw new IllegalMoveError('Nothing placed this turn to take back')
  return {
    ...state,
    pieces: state.pieces.filter(piece => piece.id !== lastId),
    placedThisTurn: state.placedThisTurn.slice(0, -1),
  }
}

function shuffleDeck(state: KowloonState): KowloonState {
  const { cards, randomState } = shuffleCards(state.cards.deck, state.randomState)
  return { ...state, cards: { ...state.cards, deck: cards }, randomState }
}

function moveCard(state: KowloonState, cardId: CardId, to: CardZone): KowloonState {
  if (!isCardId(cardId)) throw new IllegalMoveError('Unknown card')
  if (!CARD_ZONES.includes(to)) throw new IllegalMoveError(`Unknown zone "${to}"`)
  const seat = state.playerIndex
  const from = locateCard(state.cards, cardId, seat)
  if (from === null) throw new IllegalMoveError('That card is in another player’s hand')
  if (from === to) throw new IllegalMoveError(`That card is already in the ${to}`)
  return { ...state, cards: transferCard(state.cards, { cardId, from, to, seat }) }
}

function adjustPoints(state: KowloonState, seat: number, delta: number): KowloonState {
  if (!isInteger(seat) || seat < 0 || seat >= state.seatCount) throw new IllegalMoveError('Unknown seat')
  if (!isInteger(delta) || delta === 0) throw new IllegalMoveError('Points change by a whole, non-zero amount')
  return { ...state, points: state.points.map((points, pointsSeat) => (pointsSeat === seat ? points + delta : points)) }
}

function endTurn(state: KowloonState): KowloonState {
  return { ...state, playerIndex: (state.playerIndex + 1) % state.seatCount, placedThisTurn: [] }
}

export const kowloonRules: GameRules<KowloonSettings, KowloonState, KowloonMove> = {
  createInitialState({ settings, playerCount, seed }) {
    const { cards: deck, randomState } = shuffleCards(CARDS.map((_, cardId) => cardId), seed)
    return {
      tableSize: settings.tableSize,
      seatCount: playerCount,
      pieces: [],
      playerIndex: 0,
      colorShift: 0,
      nextPieceId: 1,
      placedThisTurn: [],
      cards: emptyCardTable(deck, playerCount),
      points: Array.from({ length: playerCount }, () => 0),
      randomState,
    }
  },

  // The sandbox never ends.
  activePlayer: state => state.playerIndex,

  applyMove(state, move) {
    switch (move.kind) {
      case 'place':
        return placePiece(state, move)
      case 'undo_place':
        return undoPlace(state)
      case 'rotate_colors':
        return { ...state, colorShift: (state.colorShift + 1) % SEAT_COLORS.length }
      case 'end_turn':
        return endTurn(state)
      case 'shuffle_deck':
        return shuffleDeck(state)
      case 'move_card':
        return moveCard(state, move.cardId, move.to)
      case 'adjust_points':
        return adjustPoints(state, move.seat, move.delta)
    }
  },
}
