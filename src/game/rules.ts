import { IllegalMoveError, type GameRules } from 'game-kit/turns'
import { CARD_ZONES, locateCard, newCardTable, shuffleCards, transferCard, type CardZone } from './cards/cardTable'
import { CARDS, isCardId, type CardId } from './cards/catalog'
import { findPiece } from './catalog'
import { isRotationIndex, vecKey, type Vec3 } from './geometry'
import { builtTableOf, footprintOf, placementProblem } from './placement'
import { isResource, type Resource } from './resources'
import type { KowloonMove, KowloonSettings, KowloonState, PlacedPiece, Placement } from './types'
import { scatterTokens, tokenAt, tokenPlacementProblem } from './tokens'

// Kowloon, first step: a sandbox. Players take turns placing polycube buildings on the table.
// The rules enforce where a piece may go (on the table, touching another piece, never covering a
// window) and whose turn it is. They never pay for anything or trigger an effect. Cards and
// points work the same way, and so do the resource tokens: players move, score and lay them by hand.

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isCell(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(isInteger)
}

function placePiece(state: KowloonState, placement: Placement): KowloonState {
  if (!findPiece(placement.pieceId)) throw new IllegalMoveError(`Unknown piece "${placement.pieceId}"`)
  if (!isRotationIndex(placement.orientation)) throw new IllegalMoveError('Unknown orientation')
  if (!isCell(placement.origin)) throw new IllegalMoveError('The origin must be a cell')

  const problem = placementProblem(builtTableOf(state), footprintOf(placement))
  if (problem) throw new IllegalMoveError(problem)

  const piece: PlacedPiece = { ...placement, id: state.nextPieceId, owner: state.playerIndex }
  return { ...state, pieces: [...state.pieces, piece], nextPieceId: state.nextPieceId + 1 }
}

function shuffleDeck(state: KowloonState): KowloonState {
  const { cards, randomState } = shuffleCards(state.cards.deck, state.randomState)
  return { ...state, cards: { ...state.cards, deck: cards }, randomState }
}

function moveCard(state: KowloonState, cardId: CardId, to: CardZone): KowloonState {
  if (!isCardId(cardId)) throw new IllegalMoveError('Unknown card')
  if (!CARD_ZONES.includes(to)) throw new IllegalMoveError(`Unknown zone "${to}"`)
  const from = locateCard(state.cards, cardId)
  if (from === null) throw new IllegalMoveError('That card is not on the table')
  if (from === to) throw new IllegalMoveError(`That card is already in the ${to}`)
  return { ...state, cards: transferCard(state.cards, { cardId, from, to }) }
}

function adjustPoints(state: KowloonState, seat: number, delta: number): KowloonState {
  if (!isInteger(seat) || seat < 0 || seat >= state.seatCount) throw new IllegalMoveError('Unknown seat')
  if (!isInteger(delta) || delta === 0) throw new IllegalMoveError('Points change by a whole, non-zero amount')
  return { ...state, points: state.points.map((points, pointsSeat) => (pointsSeat === seat ? points + delta : points)) }
}

function placeToken(state: KowloonState, resource: Resource, square: Vec3): KowloonState {
  if (!isResource(resource)) throw new IllegalMoveError(`Unknown resource "${resource}"`)
  if (!isCell(square)) throw new IllegalMoveError('A token goes on a cell')
  const builtCells = new Set(state.pieces.flatMap(piece => footprintOf(piece).cells.map(vecKey)))
  const problem = tokenPlacementProblem(builtCells, state.tokens, square)
  if (problem) throw new IllegalMoveError(problem)
  return { ...state, tokens: [...state.tokens, { resource, square }] }
}

function removeToken(state: KowloonState, square: Vec3): KowloonState {
  if (!isCell(square)) throw new IllegalMoveError('A token sits on a cell')
  const token = tokenAt(state.tokens, square)
  if (!token) throw new IllegalMoveError('There is no token there')
  return { ...state, tokens: state.tokens.filter(other => other !== token) }
}

function endTurn(state: KowloonState): KowloonState {
  return { ...state, playerIndex: (state.playerIndex + 1) % state.seatCount }
}

export const kowloonRules: GameRules<KowloonSettings, KowloonState, KowloonMove> = {
  createInitialState({ settings, playerCount, seed }) {
    const { cards: deck, randomState } = shuffleCards(CARDS.map(card => card.id), seed)
    const scattered = scatterTokens(settings.tableSize, randomState)
    return {
      tableSize: settings.tableSize,
      seatCount: playerCount,
      pieces: [],
      playerIndex: 0,
      nextPieceId: 1,
      cards: newCardTable(deck),
      tokens: scattered.tokens,
      points: Array.from({ length: playerCount }, () => 0),
      randomState: scattered.randomState,
    }
  },

  // The sandbox never ends.
  activePlayer: state => state.playerIndex,

  applyMove(state, move) {
    switch (move.kind) {
      case 'place':
        return placePiece(state, move)
      case 'end_turn':
        return endTurn(state)
      case 'shuffle_deck':
        return shuffleDeck(state)
      case 'move_card':
        return moveCard(state, move.cardId, move.to)
      case 'adjust_points':
        return adjustPoints(state, move.seat, move.delta)
      case 'place_token':
        return placeToken(state, move.resource, move.square)
      case 'remove_token':
        return removeToken(state, move.square)
    }
  },

  // A player who could undo a shuffle would reshuffle until the deck came up the way they liked.
  irreversibleReason: (_state, move) => (move.kind === 'shuffle_deck' ? 'You can’t take back a shuffle once the deck is reordered.' : null),
}
