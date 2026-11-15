import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { CARDS, type CardId } from './cards/catalog'
import { MARKET_ROW_SIZE } from './cards/market'
import { PIECE_SIZES } from './catalog'
import { kowloonRules } from './rules'
import { scoreOf, winnersOf } from './scoring'
import { PIECES_PER_SIZE, startingSupply } from './supply'
import type { KowloonMove, KowloonState, Placement, SeatState } from './types'

const UNTURNED = 0
const TABLE_SIZE = 5

function newGame(playerCount = 2): KowloonState {
  return kowloonRules.createInitialState({ settings: { tableSize: TABLE_SIZE }, playerCount, seed: 1 })
}

function apply(state: KowloonState, move: KowloonMove): KowloonState {
  return kowloonRules.applyMove(state, move)
}

/** The id of the first copy of the card with this name. */
function cardNamed(name: string): CardId {
  return CARDS.find(card => card.name === name)!.id
}

/** Puts these cards face up in the market, replacing whatever was in their rows. */
function withMarket(state: KowloonState, names: string[]): KowloonState {
  const ids = names.map(cardNamed)
  const rows = state.market.rows.map((row, index) => {
    const own = ids.filter(id => CARDS.find(card => card.id === id)!.size === index + 1)
    return own.length > 0 ? own : row
  })
  const decks = state.market.decks.map(deck => deck.filter(id => !ids.includes(id)))
  return { ...state, market: { ...state.market, rows, decks } }
}

function withSeat(state: KowloonState, seat: number, patch: Partial<SeatState>): KowloonState {
  return { ...state, seats: state.seats.map((existing, index) => (index === seat ? { ...existing, ...patch } : existing)) }
}

const tableau = (...names: string[]) => names.map(cardNamed)

/** Seat 0 has these pieces ready, by size 1 to 5. */
function withReady(state: KowloonState, seat: number, ready: number[]): KowloonState {
  const unready = PIECES_PER_SIZE.map((count, index) => count - ready[index])
  return withSeat(state, seat, { ready, unready })
}

const cubeAt = (x: number, y: number, z: number): Placement => ({ pieceId: 'cube', orientation: UNTURNED, origin: [x, y, z] })
const build = (card: string, placement: Placement): KowloonMove => ({ kind: 'build', cardId: cardNamed(card), ...placement })

describe('a new game', () => {
  it('gives every seat two ready cubes and the rest of its pieces unready', () => {
    for (const seat of newGame(3).seats) {
      expect(seat.ready).toEqual([2, 0, 0, 0, 0])
      expect(seat.unready).toEqual([4, 4, 3, 3, 3])
      expect(seat.tableau).toEqual([])
    }
  })

  it('turns up a row of cards of every size', () => {
    const { rows } = newGame().market
    expect(rows.map(row => row.length)).toEqual(PIECE_SIZES.map(() => MARKET_ROW_SIZE))
  })

  it('deals the same game from the same seed', () => {
    expect(newGame()).toEqual(newGame())
  })

  it('has the starting supply the rules name', () => {
    const { ready, unready } = startingSupply()
    expect(ready.map((count, index) => count + unready[index])).toEqual(PIECES_PER_SIZE)
  })
})

describe('building', () => {
  const start = withMarket(newGame(), ['Pantry', 'Mason', 'Landlord'])

  it('puts the piece on the table, spends it and moves the card into the tableau', () => {
    const after = apply(start, build('Pantry', cubeAt(2, 0, 2)))
    expect(after.pieces).toHaveLength(1)
    expect(after.pieces[0].owner).toBe(0)
    expect(after.seats[0].tableau).toEqual(tableau('Pantry'))
    expect(after.seats[0].ready[0]).toBe(1)
  })

  it('turns up a new card of that size and passes the turn', () => {
    const after = apply(start, build('Pantry', cubeAt(2, 0, 2)))
    expect(after.market.rows[0]).not.toContain(cardNamed('Pantry'))
    expect(after.market.rows[0]).toHaveLength(MARKET_ROW_SIZE)
    expect(after.playerIndex).toBe(1)
  })

  it('refuses a card that is not in the market', () => {
    expect(() => apply(start, build('Scaffold', cubeAt(2, 0, 2)))).toThrow(/not in the market/)
  })

  it('refuses a piece of the wrong size for the card', () => {
    const ready = withReady(start, 0, [2, 1, 0, 0, 0])
    expect(() => apply(ready, build('Mason', cubeAt(2, 0, 2)))).toThrow(/size 2/)
  })

  it('refuses a piece that is not ready', () => {
    expect(() => apply(start, build('Mason', { pieceId: 'domino', orientation: UNTURNED, origin: [1, 0, 1] }))).toThrow(/no ready piece of size 2/)
  })

  it('refuses a placement the shape’s rules forbid', () => {
    expect(() => apply(start, build('Pantry', cubeAt(2, 3, 2)))).toThrow(IllegalMoveError)
  })

  it('lets a shrink card build with a piece one size smaller', () => {
    const state = withReady(withSeat(withMarket(newGame(), ['Landlord']), 0, { tableau: tableau('Stilts') }), 0, [2, 1, 0, 0, 0])
    const placement: Placement = { pieceId: 'domino', orientation: UNTURNED, origin: [1, 0, 1] }
    expect(apply(state, build('Landlord', placement)).seats[0].ready[1]).toBe(0)
  })
})

describe('taking', () => {
  it('readies a size 1 piece and passes the turn', () => {
    const after = apply(newGame(), { kind: 'take' })
    expect(after.seats[0].ready[0]).toBe(3)
    expect(after.seats[0].unready[0]).toBe(3)
    expect(after.playerIndex).toBe(1)
  })

  it('is refused with no size 1 piece left', () => {
    const state = withSeat(newGame(), 0, { unready: [0, 4, 3, 3, 3] })
    expect(() => apply(state, { kind: 'take' })).toThrow(/no size 1/)
  })

  it('sets off the take cards', () => {
    const state = withSeat(newGame(), 0, { tableau: tableau('Scaffold') })
    expect(apply(state, { kind: 'take' }).seats[0].points).toBe(1)
  })
})

describe('combining', () => {
  it('returns the pieces to make a bigger one ready', () => {
    const after = apply(newGame(), { kind: 'combine', returned: [1, 1], size: 2 })
    expect(after.seats[0].ready).toEqual([0, 1, 0, 0, 0])
    expect(after.seats[0].unready).toEqual([6, 3, 3, 3, 3])
  })

  it('refuses pieces that are too small', () => {
    expect(() => apply(newGame(), { kind: 'combine', returned: [1, 1], size: 3 })).toThrow(/too little/)
  })

  it('refuses pieces that are not ready', () => {
    expect(() => apply(newGame(), { kind: 'combine', returned: [1, 1, 1], size: 3 })).toThrow(/ready/)
  })

  it('lets each combine bonus make the pieces count for one more', () => {
    const state = withSeat(newGame(), 0, { tableau: tableau('Lever') })
    expect(apply(state, { kind: 'combine', returned: [1, 1], size: 3 }).seats[0].ready[2]).toBe(1)
  })

  it('sets off the combine cards', () => {
    const state = withSeat(newGame(), 0, { tableau: tableau('Pulley') })
    expect(apply(state, { kind: 'combine', returned: [1, 1], size: 2 }).seats[0].points).toBe(1)
  })
})

describe('triggers', () => {
  it('does not fire a card for the build that earned it', () => {
    const state = withMarket(newGame(), ['Pantry'])
    const after = apply(state, build('Pantry', cubeAt(0, 0, 0)))
    expect(after.seats[0].ready[0]).toBe(1)
  })

  it('fires a card when its player builds again', () => {
    const state = withSeat(withMarket(newGame(), ['Pantry']), 0, { tableau: tableau('Pantry') })
    expect(apply(state, build('Pantry', cubeAt(0, 0, 0))).seats[0].ready[0]).toBe(2)
  })

  it('chains an effect that readies a piece into the take cards', () => {
    const state = withSeat(withMarket(newGame(), ['Pantry']), 0, { tableau: tableau('Pantry', 'Scaffold') })
    const after = apply(state, build('Pantry', cubeAt(2, 0, 2)))
    expect(after.seats[0].points).toBe(1)
  })

  it('fires each card at most once per action', () => {
    const state = withSeat(newGame(), 0, { tableau: tableau('Fishmonger') })
    const after = apply(state, { kind: 'take' })
    // One take by the player and one by the card, not an endless chain.
    expect(after.seats[0].ready[0]).toBe(4)
  })

  it('does not set off covered for a player building on their own piece', () => {
    let state = withSeat(withMarket(newGame(), ['Pantry']), 0, { tableau: tableau('Landlord') })
    state = apply(state, build('Pantry', cubeAt(2, 0, 2)))
    state = apply(state, { kind: 'take' })
    state = apply(withMarket(state, ['Pantry']), build('Pantry', cubeAt(2, 1, 2)))
    expect(state.seats[0].points).toBe(0)
  })

  it('pays the covered player when another builds on their piece', () => {
    let state = withSeat(withMarket(newGame(), ['Pantry']), 0, { tableau: tableau('Landlord') })
    state = apply(state, build('Pantry', cubeAt(2, 0, 2)))
    state = apply(withMarket(state, ['Pantry']), build('Pantry', cubeAt(2, 1, 2)))
    expect(state.seats[0].points).toBe(2)
  })
})

describe('passing', () => {
  it('is refused while something can be done', () => {
    expect(() => apply(newGame(), { kind: 'pass' })).toThrow(/can still/)
  })

  it('passes the turn when nothing can be done', () => {
    const stuck = withSeat(newGame(), 0, { ready: [0, 0, 0, 0, 0], unready: [0, 4, 3, 3, 3] })
    expect(apply(stuck, { kind: 'pass' }).playerIndex).toBe(1)
  })
})

describe('the end of the game', () => {
  const FIRST_BAR_ROW = 0
  const SECOND_BAR_ROW = 1
  const THIRD_BAR: Placement = { pieceId: 'long-bar', orientation: UNTURNED, origin: [2, 0, 3] }

  /** Seat 0 has already built two long bars and has a third ready. */
  function nearTheEnd(): KowloonState {
    const longBarAt = (id: number, z: number): KowloonState['pieces'][number] => ({
      id,
      owner: 0,
      pieceId: 'long-bar',
      orientation: UNTURNED,
      origin: [2, 0, z],
    })
    const state = withReady(withMarket(newGame(), ['Skyline']), 0, [0, 0, 0, 0, 1])
    return { ...state, pieces: [longBarAt(1, FIRST_BAR_ROW), longBarAt(2, SECOND_BAR_ROW)], nextPieceId: 3 }
  }

  it('plays out the round once someone has built enough large pieces', () => {
    const triggered = apply(nearTheEnd(), build('Skyline', THIRD_BAR))
    expect(triggered.isEndTriggered).toBe(true)
    expect(triggered.isOver).toBe(false)
    expect(kowloonRules.activePlayer(triggered)).toBe(1)
  })

  it('ends after the last seat has had its turn', () => {
    const over = apply(apply(nearTheEnd(), build('Skyline', THIRD_BAR)), { kind: 'take' })
    expect(over.isOver).toBe(true)
    expect(kowloonRules.activePlayer(over)).toBeNull()
  })
})

describe('scoring', () => {
  it('adds the sizes of a seat’s cards to its points', () => {
    const state = withSeat(newGame(), 0, { tableau: tableau('Skyline', 'Mason'), points: 4 })
    expect(scoreOf(state.seats[0])).toBe(5 + 2 + 4)
  })

  it('names every seat that ties for the highest score', () => {
    const seats = newGame(3).seats.map((seat, index) => ({ ...seat, points: index === 2 ? 0 : 3 }))
    expect(winnersOf(seats)).toEqual([0, 1])
  })
})
