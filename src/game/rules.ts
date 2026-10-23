import { IllegalMoveError, type GameRules } from 'game-kit/turns'
import { CARD_ZONES, newCardTable, locateCard, shuffleCards, transferCard, type CardZone } from './cards/cardTable'
import { CARDS, findCard, isCardId, type CardDefinition, type CardId } from './cards/catalog'
import { findPiece } from './catalog'
import { isRotationIndex, isSameVec, vecKey, type Vec3 } from './geometry'
import { builtTableOf, footprintOf, placementProblem } from './placement'
import { isResource, type Resource } from './resources'
import type { KowloonMove, KowloonSettings, KowloonState, PlacedPiece, Placement } from './types'
import { SEAT_COLORS } from './seatColors'
import { tokenAt, tokenPlacementProblem } from './tokens'

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
  return {
    ...state,
    pieces: [...state.pieces, piece],
    nextPieceId: state.nextPieceId + 1,
    placedThisTurn: [...state.placedThisTurn, piece.id],
  }
}

function undoPlace(state: KowloonState): KowloonState {
  const lastId = state.placedThisTurn.at(-1)
  const lastPiece = state.pieces.find(piece => piece.id === lastId)
  if (!lastPiece) throw new IllegalMoveError('Nothing placed this turn to take back')
  // Tokens laid on the piece come off with it.
  const lastCells = footprintOf(lastPiece).cells
  return {
    ...state,
    pieces: state.pieces.filter(piece => piece !== lastPiece),
    tokens: state.tokens.filter(token => !lastCells.some(cell => isSameVec(cell, token.square))),
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
  if (to === 'static' && findCard(cardId)?.market !== 'static') throw new IllegalMoveError('Only static market cards go back there')
  return { ...state, cards: transferCard(state.cards, { cardId, from, to, seat }) }
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
  return { ...state, playerIndex: (state.playerIndex + 1) % state.seatCount, placedThisTurn: [] }
}

export const kowloonRules: GameRules<KowloonSettings, KowloonState, KowloonMove> = {
  createInitialState({ settings, playerCount, seed }) {
    const cardIdsIn = (market: CardDefinition['market']) => CARDS.filter(card => card.market === market).map(card => card.id)
    const { cards: deck, randomState } = shuffleCards(cardIdsIn('deck'), seed)
    return {
      tableSize: settings.tableSize,
      seatCount: playerCount,
      pieces: [],
      playerIndex: 0,
      colorShift: 0,
      nextPieceId: 1,
      placedThisTurn: [],
      cards: newCardTable(cardIdsIn('static'), deck, playerCount),
      tokens: [],
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
      case 'place_token':
        return placeToken(state, move.resource, move.square)
      case 'remove_token':
        return removeToken(state, move.square)
    }
  },
}
