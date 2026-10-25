import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import { drawCard } from './cards/cardTable'
import { findCard, type CardId } from './cards/catalog'
import { PIECES } from './catalog'
import { ROTATION_COUNT, vecKey, type Vec3 } from './geometry'
import { builtTableOf, footprintOf, placementProblem, type Footprint } from './placement'
import { canPay, placementOptions, playProblem } from './play'
import { resourcesFor } from './resources'
import { kowloonRules } from './rules'
import type { PlacedToken } from './tokens'
import type { KowloonMove, KowloonSettings, KowloonState, Placement } from './types'

const UNTURNED = 0
const TABLE_SIZE = 5

function newGame(playerCount = 2, settings: Partial<KowloonSettings> = {}): KowloonState {
  return kowloonRules.createInitialState({ settings: { tableSize: TABLE_SIZE, resourceCount: 4, ...settings }, playerCount, seed: 1 })
}

function apply(state: KowloonState, move: KowloonMove): KowloonState {
  return kowloonRules.applyMove(state, move)
}

// C01 takes Data, Parts and Food and makes Workers.
const FIRST_CARD = 'C01'

/** Puts exactly these cards at the front of seat 0's hand, taking them out of every other pile. */
function withHand(state: KowloonState, cardIds: CardId[]): KowloonState {
  const without = (ids: CardId[]) => ids.filter(id => !cardIds.includes(id))
  const { deck, hands, discard } = state.cards
  const newHands = hands.map((hand, seat) => (seat === 0 ? [...cardIds, ...without(hand)] : without(hand)))
  return { ...state, cards: { deck: without(deck), discard: without(discard), hands: newHands } }
}

function withTokens(state: KowloonState, tokens: PlacedToken[]): KowloonState {
  return { ...state, tokens }
}

// A tripod lying on the table at (1,0,1) rests on the table squares (1,1), (2,1) and (1,2).
const TRIPOD: Placement = { pieceId: 'tripod-peak', orientation: UNTURNED, origin: [1, 0, 1] }
const TRIPOD_INPUTS: PlacedToken[] = [
  { resource: 'wifi', square: [1, -1, 1] },
  { resource: 'cog', square: [2, -1, 1] },
  { resource: 'fish', square: [1, -1, 2] },
]

function readyToPlay(extraTokens: PlacedToken[] = []): KowloonState {
  return withTokens(withHand(newGame(), [FIRST_CARD]), [...TRIPOD_INPUTS, ...extraTokens])
}

const playTripod = (state: KowloonState, cardId: CardId = FIRST_CARD): KowloonState => apply(state, { kind: 'play', cardId, ...TRIPOD })

function tableOf(pieces: Placement[] = [], tableSize = TABLE_SIZE) {
  return builtTableOf({ tableSize, tokens: [], pieces: pieces.map((placement, index) => ({ ...placement, id: index + 1, owner: 0 })) })
}

function shape(cells: Vec3[], windows: Footprint['windows'] = []): Footprint {
  return { cells, windows }
}

/** Four cubes in a row along x from the origin. */
const ROW: Vec3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]

describe('a new game', () => {
  it('deals every seat a hand of five and a supply of two of each piece', () => {
    const state = newGame(3)
    expect(state.cards.hands.map(hand => hand.length)).toEqual([5, 5, 5])
    expect(state.cards.deck).toHaveLength(48 - 15)
    for (const supply of state.supplies) {
      expect(Object.keys(supply)).toHaveLength(PIECES.length)
      expect(Object.values(supply).every(count => count === 2)).toBe(true)
    }
  })

  it('puts one random token on every square of the table', () => {
    const { tokens } = newGame()
    expect(tokens).toHaveLength(TABLE_SIZE * TABLE_SIZE)
    expect(tokens.every(token => token.square[1] === -1)).toBe(true)
  })

  it('deals the same game from the same seed', () => {
    expect(newGame()).toEqual(newGame())
  })

  it('plays with three kinds of token when asked', () => {
    const state = newGame(2, { resourceCount: 3 })
    const resources = resourcesFor(3)
    expect(state.tokens.every(token => resources.includes(token.resource))).toBe(true)
    const everyCard = [...state.cards.deck, ...state.cards.hands.flat()].map(cardId => findCard(cardId, resources)!)
    expect(everyCard).toHaveLength(48)
    expect(everyCard.every(card => [...card.inputs, card.output].every(resource => resources.includes(resource)))).toBe(true)
  })
})

describe('where a piece may rest', () => {
  it('lets a piece overhang the table when more of it rests on the table than hangs in the air', () => {
    expect(placementProblem(tableOf([], 3), shape(ROW))).toBeNull()
  })

  it('refuses a piece with as much hanging in the air as resting on the table', () => {
    expect(placementProblem(tableOf([], 2), shape(ROW))).toMatch(/hangs in the air/)
  })

  it('refuses a piece that rests on nothing', () => {
    expect(placementProblem(tableOf(), shape([[2, 3, 2]]))).toMatch(/Rest it/)
  })

  it('lets a piece rest on a building', () => {
    expect(placementProblem(tableOf([TRIPOD]), shape([[2, 1, 1]]))).toBeNull()
  })

  it('refuses a piece that sinks below the table top', () => {
    expect(placementProblem(tableOf(), shape([[2, -1, 2]]))).toMatch(/between the table top/)
  })

  it('refuses a piece that overlaps another', () => {
    expect(placementProblem(tableOf([TRIPOD]), shape([[2, 0, 1]]))).toMatch(/already taken/)
  })

  it('refuses a window facing the table', () => {
    const facingDown = shape([[0, 0, 0]], [{ cell: [0, 0, 0], normal: [0, -1, 0] }])
    expect(placementProblem(tableOf(), facingDown)).toBe('A window can’t face the table.')
  })

  it('lets a window face down past the table’s edge', () => {
    const hangingWindow = shape(ROW, [{ cell: [3, 0, 0], normal: [0, -1, 0] }])
    expect(placementProblem(tableOf([], 3), hangingWindow)).toBeNull()
  })

  it('refuses a flat piece lying on the table, since its underside has a window', () => {
    const lying = footprintOf({ pieceId: 'square', orientation: UNTURNED, origin: [1, 0, 1] })
    expect(placementProblem(tableOf(), lying)).toBe('A window can’t face the table.')
  })

  it('refuses a piece whose own window would be covered', () => {
    const facingTripod = shape([[3, 0, 1]], [{ cell: [3, 0, 1], normal: [-1, 0, 0] }])
    expect(placementProblem(tableOf([TRIPOD]), facingTripod)).toBe('A window of this piece would be covered.')
  })

  it('refuses a piece that would cover a window already built', () => {
    // The tripod's peak window faces up, so (1,2,1) must stay empty.
    expect(placementProblem(tableOf([TRIPOD]), shape([[1, 2, 1]]))).toBe('This piece would cover a window.')
  })
})

describe('playing a card with a piece', () => {
  it('builds the piece, uses up the tokens it rests on and lays the card’s output on its open top faces', () => {
    const after = playTripod(readyToPlay([{ resource: 'fish', square: [4, -1, 4] }]))
    expect(after.pieces).toHaveLength(1)
    // Only the unused token and the two outputs remain: the peak’s window and the covered cube get none.
    expect(after.tokens).toHaveLength(3)
    expect(after.tokens).toEqual(
      expect.arrayContaining([
        { resource: 'fish', square: [4, -1, 4] },
        { resource: 'users', square: [2, 0, 1] },
        { resource: 'users', square: [1, 0, 2] },
      ]),
    )
  })

  it('discards the card, draws a new one and passes the turn', () => {
    const before = readyToPlay()
    const after = playTripod(before)
    expect(after.cards.discard).toEqual([FIRST_CARD])
    expect(after.cards.hands[0]).toHaveLength(before.cards.hands[0].length)
    expect(after.cards.hands[0]).not.toContain(FIRST_CARD)
    expect(after.cards.deck).toHaveLength(before.cards.deck.length - 1)
    expect(after.playerIndex).toBe(1)
  })

  it('takes a piece out of the player’s supply', () => {
    const after = playTripod(readyToPlay())
    expect(after.supplies[0]['tripod-peak']).toBe(1)
    expect(after.supplies[1]['tripod-peak']).toBe(2)
  })

  it('credits the piece to the seat that placed it', () => {
    expect(playTripod(readyToPlay()).pieces[0].owner).toBe(0)
  })

  it('refuses a piece that is not resting on the card’s inputs', () => {
    const state = withTokens(withHand(newGame(), [FIRST_CARD]), [...TRIPOD_INPUTS.slice(0, 2), { resource: 'users', square: [1, -1, 2] }])
    expect(() => playTripod(state)).toThrow(/missing Food/)
  })

  it('refuses a card that is not in the player’s hand', () => {
    const state = readyToPlay()
    expect(() => playTripod(state, 'C02')).toThrow(IllegalMoveError)
  })

  it('refuses a piece the player has run out of', () => {
    const state = readyToPlay()
    const spent = { ...state, supplies: [{ ...state.supplies[0], 'tripod-peak': 0 }, state.supplies[1]] }
    expect(() => playTripod(spent)).toThrow(/no more of that piece/)
  })

  it('refuses a placement the shape’s rules forbid', () => {
    const state = withTokens(withHand(newGame(), [FIRST_CARD]), [])
    const lying: KowloonMove = { kind: 'play', cardId: FIRST_CARD, pieceId: 'square', orientation: UNTURNED, origin: [1, 0, 1] }
    expect(() => apply(state, lying)).toThrow(IllegalMoveError)
  })

  it('refills an empty deck from the discard pile', () => {
    const { cards, randomState } = drawCard({ deck: [], hands: [[]], discard: ['C03', 'C04'] }, 0, 1)
    expect(cards.hands[0]).toHaveLength(1)
    expect(cards.deck).toHaveLength(1)
    expect(cards.discard).toEqual([])
    expect(randomState).not.toBe(1)
  })
})

describe('passing', () => {
  it('is refused while a card can be played', () => {
    expect(() => apply(readyToPlay(), { kind: 'pass' })).toThrow(/can still play/)
  })

  it('passes the turn when nothing can be played', () => {
    const stuck = withTokens(newGame(), [])
    expect(apply(stuck, { kind: 'pass' }).playerIndex).toBe(1)
  })
})

describe('finding the valid placements', () => {
  const pieceIds = PIECES.map(piece => piece.id)

  /** The same footprint however the piece was turned to get it. */
  const footprintKey = (placement: Placement): string => {
    const { cells, windows } = footprintOf(placement)
    return [...cells.map(vecKey).sort(), '|', ...windows.map(window => `${vecKey(window.cell)}>${vecKey(window.normal)}`).sort()].join(';')
  }

  it('finds the placement the rules accept for a card, and nothing the rules refuse', () => {
    const state = readyToPlay([{ resource: 'fish', square: [4, -1, 4] }])
    const card = findCard(FIRST_CARD, resourcesFor(4))!
    const table = builtTableOf(state)
    const found = new Set([...placementOptions(table, pieceIds)].filter(option => canPay(option, card)).map(option => footprintKey(option.placement)))

    for (const pieceId of pieceIds) {
      for (let orientation = 0; orientation < ROTATION_COUNT; orientation++) {
        for (let x = -1; x <= TABLE_SIZE; x++) {
          for (let z = -1; z <= TABLE_SIZE; z++) {
            for (let y = 0; y <= 1; y++) {
              const placement: Placement = { pieceId, orientation, origin: [x, y, z] }
              const isAccepted = playProblem(table, placement, card) === null
              expect(found.has(footprintKey(placement)) === isAccepted).toBe(true)
            }
          }
        }
      }
    }
    expect(found.has(footprintKey(TRIPOD))).toBe(true)
  })

  it('only offers placements the game then accepts', () => {
    const state = readyToPlay()
    const card = findCard(FIRST_CARD, resourcesFor(4))!
    const playable = [...placementOptions(builtTableOf(state), pieceIds)].filter(option => canPay(option, card))
    expect(playable.length).toBeGreaterThan(0)
    for (const { placement } of playable) {
      expect(() => apply(state, { kind: 'play', cardId: FIRST_CARD, ...placement })).not.toThrow()
    }
  })
})

describe('points', () => {
  it('start at zero for every seat', () => {
    expect(newGame(3).points).toEqual([0, 0, 0])
  })

  it('can be added to and taken from any seat by the active player', () => {
    const state = apply(apply(newGame(), { kind: 'adjust_points', seat: 1, delta: 3 }), { kind: 'adjust_points', seat: 1, delta: -1 })
    expect(state.points).toEqual([0, 2])
  })

  it('refuse an unknown seat', () => {
    expect(() => apply(newGame(), { kind: 'adjust_points', seat: 2, delta: 1 })).toThrow(IllegalMoveError)
  })
})
