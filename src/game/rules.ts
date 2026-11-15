import { IllegalMoveError, type GameRules } from 'game-kit/turns'
import { cardsOf, countPassive, findCard, isCardId, type CardDefinition, type CardId } from './cards/catalog'
import { dealMarket, isInMarket, marketCards, takeFromMarket } from './cards/market'
import { findPiece, PIECE_SIZES } from './catalog'
import { combinationFor, combined, resolveTriggers, taken } from './effects'
import { isRotationIndex, type Vec3 } from './geometry'
import { builtTableOf, footprintOf } from './placement'
import { buildProblem, coveredSeats, hasAnyBuild } from './play'
import { hasMetEndCondition } from './scoring'
import { countOf, countSizes, hasAtLeast, isPieceSize, startingSupply } from './supply'
import type { KowloonMove, KowloonSettings, KowloonState, PlacedPiece, Placement, SeatState } from './types'

// Kowloon. On their turn a player does one of three things:
//  - build: pair a card from the market with a ready polycube of the card's size. The polycube
//    goes on the shared table and the card joins the player's tableau, which is their engine;
//  - take: make one of their size 1 polycubes ready;
//  - combine: return ready polycubes to make a bigger one ready.
// Each of those sets off the player's cards with the matching trigger (and building sets off the
// covered trigger for everyone whose polycubes it rests on). Effects can chain.

type BuildMove = Extract<KowloonMove, { kind: 'build' }>
type CombineMove = Extract<KowloonMove, { kind: 'combine' }>

function isInteger(value: unknown): value is number {
  return Number.isInteger(value)
}

function isCell(value: unknown): value is Vec3 {
  return Array.isArray(value) && value.length === 3 && value.every(isInteger)
}

function replaceSeat(seats: readonly SeatState[], seat: number, replacement: SeatState): SeatState[] {
  return seats.map((existing, index) => (index === seat ? replacement : existing))
}

/** Ends the active player's turn, and the game if the final round is now complete. */
function endTurn(state: KowloonState): KowloonState {
  const isEndTriggered = state.isEndTriggered || hasMetEndCondition(state.pieces, state.playerIndex)
  const next = (state.playerIndex + 1) % state.seatCount
  return { ...state, isEndTriggered, isOver: isEndTriggered && next === 0, playerIndex: next }
}

function marketCard(state: KowloonState, cardId: CardId): CardDefinition {
  const card = isCardId(cardId) ? findCard(cardId) : undefined
  if (!card || !isInMarket(state.market, cardId)) throw new IllegalMoveError('That card is not in the market')
  return card
}

function checkPlacement({ pieceId, orientation, origin }: Placement): void {
  if (!findPiece(pieceId)) throw new IllegalMoveError(`Unknown piece "${pieceId}"`)
  if (!isRotationIndex(orientation)) throw new IllegalMoveError('Unknown orientation')
  if (!isCell(origin)) throw new IllegalMoveError('The origin must be a cell')
}

function build(state: KowloonState, { cardId, pieceId, orientation, origin }: BuildMove): KowloonState {
  const seat = state.playerIndex
  const own = state.seats[seat]
  const card = marketCard(state, cardId)
  const placement: Placement = { pieceId, orientation, origin }
  checkPlacement(placement)

  const size = findPiece(pieceId)?.size ?? 0
  const problem = buildProblem(builtTableOf(state), placement, card, countPassive(own.tableau, 'shrink'))
  if (problem) throw new IllegalMoveError(problem)
  if (countOf(own.ready, size) < 1) throw new IllegalMoveError(`You have no ready piece of size ${size}. Take or combine first.`)

  const footprint = footprintOf(placement)
  const covered = coveredSeats(state.pieces, footprint, seat, state.seatCount)
  const spent: SeatState = { ...own, ready: own.ready.map((count, index) => (index === size - 1 ? count - 1 : count)) }
  const resolved = resolveTriggers(replaceSeat(state.seats, seat, spent), [
    { seat, trigger: 'build' },
    ...covered.map(coveredSeat => ({ seat: coveredSeat, trigger: 'covered' as const })),
  ])
  // The new card joins the tableau after its own build has resolved, so it doesn't fire for itself.
  const builder: SeatState = { ...resolved[seat], tableau: [...resolved[seat].tableau, cardId] }
  const piece: PlacedPiece = { ...placement, id: state.nextPieceId, owner: seat }

  return endTurn({
    ...state,
    pieces: [...state.pieces, piece],
    nextPieceId: state.nextPieceId + 1,
    market: takeFromMarket(state.market, cardId),
    seats: replaceSeat(resolved, seat, builder),
  })
}

function take(state: KowloonState): KowloonState {
  const seat = state.playerIndex
  if (countOf(state.seats[seat].unready, 1) < 1) throw new IllegalMoveError('You have no size 1 polycube left to take')
  const resolved = resolveTriggers(replaceSeat(state.seats, seat, taken(state.seats[seat], 1)), [{ seat, trigger: 'take' }])
  return endTurn({ ...state, seats: resolved })
}

function checkCombine(own: SeatState, { returned, size }: CombineMove): void {
  if (!isPieceSize(size) || size < 2) throw new IllegalMoveError('Combine into a size 2 to 5 polycube')
  if (!Array.isArray(returned) || returned.length < 2 || !returned.every(isPieceSize)) throw new IllegalMoveError('Return at least two polycubes')
  if (returned.some(returnedSize => returnedSize >= size)) throw new IllegalMoveError('Return only polycubes smaller than the one you make')
  if (!hasAtLeast(own.ready, countSizes(returned))) throw new IllegalMoveError('You don’t have those polycubes ready')
  if (countOf(own.unready, size) < 1) throw new IllegalMoveError(`You have no size ${size} polycube left to ready`)
  const total = returned.reduce((sum, returnedSize) => sum + returnedSize, 0)
  const bonus = countPassive(own.tableau, 'combineBonus')
  if (total + bonus < size) throw new IllegalMoveError(`Those add up to ${total}, which is too little for a size ${size}.`)
}

function combine(state: KowloonState, move: CombineMove): KowloonState {
  const seat = state.playerIndex
  checkCombine(state.seats[seat], move)
  const resolved = resolveTriggers(replaceSeat(state.seats, seat, combined(state.seats[seat], move.returned, move.size)), [
    { seat, trigger: 'combine' },
  ])
  return endTurn({ ...state, seats: resolved })
}

/** Whether the active player has anything they could do. */
function canAct(state: KowloonState): boolean {
  const own = state.seats[state.playerIndex]
  if (countOf(own.unready, 1) > 0) return true
  if (PIECE_SIZES.some(size => size >= 2 && combinationFor(own, size) !== null)) return true
  const shrinkCount = countPassive(own.tableau, 'shrink')
  return hasAnyBuild(builtTableOf(state), own.ready, cardsOf(marketCards(state.market)), shrinkCount)
}

function pass(state: KowloonState): KowloonState {
  if (canAct(state)) throw new IllegalMoveError('You can still take, combine or build, so you can’t pass')
  return endTurn(state)
}

export const kowloonRules: GameRules<KowloonSettings, KowloonState, KowloonMove> = {
  createInitialState({ settings, playerCount, seed }) {
    const dealt = dealMarket(seed)
    return {
      tableSize: settings.tableSize,
      seatCount: playerCount,
      pieces: [],
      playerIndex: 0,
      nextPieceId: 1,
      market: dealt.market,
      seats: Array.from({ length: playerCount }, () => ({ ...startingSupply(), tableau: [], points: 0 })),
      isEndTriggered: false,
      isOver: false,
      randomState: dealt.randomState,
    }
  },

  activePlayer: state => (state.isOver ? null : state.playerIndex),

  applyMove(state, move) {
    switch (move.kind) {
      case 'build':
        return build(state, move)
      case 'take':
        return take(state)
      case 'combine':
        return combine(state, move)
      case 'pass':
        return pass(state)
    }
  },
}
