import { IllegalMoveError, type GameRules } from 'game-kit/turns'
import { dealCardTable, discardFromHand, drawCard } from './cards/cardTable'
import { cardsFor, findCard, isCardId, type CardDefinition, type CardId } from './cards/catalog'
import { findPiece, PIECES } from './catalog'
import { isRotationIndex, vecKey, type Vec3 } from './geometry'
import { builtTableOf, footprintOf } from './placement'
import { hasAnyPlay, outputSquares, playProblem, tokensToPay, tokensUnder } from './play'
import { resourcesFor } from './resources'
import { scatterTokens, type PlacedToken } from './tokens'
import type { KowloonMove, KowloonSettings, KowloonState, PieceSupply, PlacedPiece, Placement } from './types'

// Kowloon, first draft of the rules. On their turn a player combines a card from their hand with
// a piece from their supply and puts the piece on the table. The card names three resources the
// piece must be resting on (tokens on the table or on the buildings below); they are used up. The
// piece then lays the card's output on each of its open top faces without a window. The player
// draws a card and play passes on.

export const COPIES_PER_PIECE = 2

type PlayMove = Extract<KowloonMove, { kind: 'play' }>

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isCell(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(isInteger)
}

function newSupply(): PieceSupply {
  return Object.fromEntries(PIECES.map(piece => [piece.id, COPIES_PER_PIECE]))
}

function cardInHand(state: KowloonState, cardId: CardId): CardDefinition {
  const card = isCardId(cardId) ? findCard(cardId, resourcesFor(state.resourceCount)) : undefined
  if (!card || !state.cards.hands[state.playerIndex].includes(cardId)) throw new IllegalMoveError('That card is not in your hand')
  return card
}

function checkPlacement({ pieceId, orientation, origin }: Placement, state: KowloonState): void {
  if (!findPiece(pieceId)) throw new IllegalMoveError(`Unknown piece "${pieceId}"`)
  if (!isRotationIndex(orientation)) throw new IllegalMoveError('Unknown orientation')
  if (!isCell(origin)) throw new IllegalMoveError('The origin must be a cell')
  if ((state.supplies[state.playerIndex][pieceId] ?? 0) < 1) throw new IllegalMoveError('You have no more of that piece')
}

function withNextPlayer(state: KowloonState): KowloonState {
  return { ...state, playerIndex: (state.playerIndex + 1) % state.seatCount }
}

function play(state: KowloonState, { cardId, pieceId, orientation, origin }: PlayMove): KowloonState {
  const seat = state.playerIndex
  const card = cardInHand(state, cardId)
  const placement: Placement = { pieceId, orientation, origin }
  checkPlacement(placement, state)

  const table = builtTableOf(state)
  const problem = playProblem(table, placement, card)
  if (problem) throw new IllegalMoveError(problem)

  const footprint = footprintOf(placement)
  const paidKeys = new Set(tokensToPay(card, tokensUnder(table, footprint)).map(token => vecKey(token.square)))
  const outputs: PlacedToken[] = outputSquares(table, footprint).map(square => ({ resource: card.output, square }))
  const piece: PlacedPiece = { ...placement, id: state.nextPieceId, owner: seat }

  const drawn = drawCard(discardFromHand(state.cards, seat, cardId), seat, state.randomState)
  return withNextPlayer({
    ...state,
    pieces: [...state.pieces, piece],
    nextPieceId: state.nextPieceId + 1,
    supplies: state.supplies.map((supply, supplySeat) => (supplySeat === seat ? { ...supply, [pieceId]: supply[pieceId] - 1 } : supply)),
    tokens: [...state.tokens.filter(token => !paidKeys.has(vecKey(token.square))), ...outputs],
    cards: drawn.cards,
    randomState: drawn.randomState,
  })
}

function pass(state: KowloonState): KowloonState {
  const resources = resourcesFor(state.resourceCount)
  const hand = state.cards.hands[state.playerIndex].flatMap(cardId => findCard(cardId, resources) ?? [])
  const supply = state.supplies[state.playerIndex]
  const pieceIds = PIECES.map(piece => piece.id).filter(pieceId => supply[pieceId] > 0)
  if (hasAnyPlay(builtTableOf(state), pieceIds, hand)) throw new IllegalMoveError('You can still play a card, so you can’t pass')
  return withNextPlayer(state)
}

function adjustPoints(state: KowloonState, seat: number, delta: number): KowloonState {
  if (!isInteger(seat) || seat < 0 || seat >= state.seatCount) throw new IllegalMoveError('Unknown seat')
  if (!isInteger(delta) || delta === 0) throw new IllegalMoveError('Points change by a whole, non-zero amount')
  return { ...state, points: state.points.map((points, pointsSeat) => (pointsSeat === seat ? points + delta : points)) }
}

export const kowloonRules: GameRules<KowloonSettings, KowloonState, KowloonMove> = {
  createInitialState({ settings, playerCount, seed }) {
    const resources = resourcesFor(settings.resourceCount)
    const dealt = dealCardTable(cardsFor(resources).map(card => card.id), playerCount, seed)
    const scattered = scatterTokens(settings.tableSize, resources, dealt.randomState)
    return {
      tableSize: settings.tableSize,
      resourceCount: settings.resourceCount,
      seatCount: playerCount,
      pieces: [],
      playerIndex: 0,
      nextPieceId: 1,
      cards: dealt.cards,
      supplies: Array.from({ length: playerCount }, newSupply),
      tokens: scattered.tokens,
      points: Array.from({ length: playerCount }, () => 0),
      randomState: scattered.randomState,
    }
  },

  // The game has no end yet.
  activePlayer: state => state.playerIndex,

  applyMove(state, move) {
    switch (move.kind) {
      case 'play':
        return play(state, move)
      case 'pass':
        return pass(state)
      case 'adjust_points':
        return adjustPoints(state, move.seat, move.delta)
    }
  },
}
