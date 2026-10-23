import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import type { CardZone } from './cards/cardTable'
import { CARDS, findCard } from './cards/catalog'
import { PIECES } from './catalog'
import { ROTATION_COUNT, ROTATIONS, screenAxes, turnOrientation, vecKey } from './geometry'
import { footprintOf, originForAim, windowFront } from './placement'
import { kowloonRules } from './rules'
import type { KowloonMove, KowloonState } from './types'

const UNTURNED = 0

function newGame(playerCount = 2): KowloonState {
  return kowloonRules.createInitialState({ settings: { tableSize: 10 }, playerCount, seed: 1 })
}

function place(pieceId: string, origin: [number, number, number], orientation = UNTURNED): KowloonMove {
  return { kind: 'place', pieceId, orientation, origin }
}

function play(state: KowloonState, ...moves: KowloonMove[]): KowloonState {
  return moves.reduce(kowloonRules.applyMove, state)
}

describe('the piece catalog', () => {
  it('has distinct ids', () => {
    expect(new Set(PIECES.map(piece => piece.id)).size).toBe(PIECES.length)
  })

  it.each(PIECES.map(piece => [piece.id, piece] as const))('%s is four cubes with one or two outward windows facing different ways', (_id, piece) => {
    const cellKeys = new Set(piece.cells.map(vecKey))
    expect(cellKeys.size).toBe(4)
    expect(piece.cells[0]).toEqual([0, 0, 0])
    expect(piece.windows.length).toBeGreaterThanOrEqual(1)
    expect(piece.windows.length).toBeLessThanOrEqual(2)
    for (const window of piece.windows) {
      const front = windowFront({ cell: piece.cells[window.cell], normal: window.normal })
      expect(cellKeys.has(vecKey(front))).toBe(false)
    }
    expect(new Set(piece.windows.map(window => vecKey(window.normal))).size).toBe(piece.windows.length)
  })

  it('keeps every piece connected', () => {
    for (const piece of PIECES) {
      const remaining = new Set(piece.cells.map(vecKey))
      const frontier = [piece.cells[0]]
      remaining.delete(vecKey(piece.cells[0]))
      while (frontier.length > 0) {
        const [x, y, z] = frontier.pop()!
        for (const neighbor of [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]] as const) {
          if (remaining.delete(vecKey(neighbor))) frontier.push(neighbor)
        }
      }
      expect(remaining.size, piece.id).toBe(0)
    }
  })
})

describe('rotations', () => {
  it('are the 24 distinct proper rotations', () => {
    expect(ROTATION_COUNT).toBe(24)
    expect(new Set(ROTATIONS.map(rotation => rotation.join(','))).size).toBe(24)
  })

  it('return to the start after four quarter turns', () => {
    const turned = [1, 2, 3, 4].reduce(orientation => turnOrientation(orientation, 1, 1), 5)
    expect(turned).toBe(5)
  })

  it('undo a turn with the opposite turn', () => {
    expect(turnOrientation(turnOrientation(7, 0, 1), 0, -1)).toBe(7)
  })

  it('cannot turn the right screw into the left screw', () => {
    const shapeOf = (pieceId: string, orientation: number) =>
      footprintOf({ pieceId, orientation, origin: [0, 0, 0] })
        .cells.map(vecKey)
        .sort()
        .join('|')
    const leftShapes = new Set(ROTATIONS.map((_, orientation) => shapeOf('left-screw-end', orientation)))
    expect(leftShapes.has(shapeOf('right-screw-end', UNTURNED))).toBe(false)
  })

  it('reads the camera’s right-hand side from its azimuth', () => {
    expect(screenAxes(0).right).toEqual({ axis: 0, sign: 1 })
    expect(screenAxes(Math.PI / 2).right).toEqual({ axis: 2, sign: -1 })
    expect(screenAxes(Math.PI).forward).toEqual({ axis: 2, sign: 1 })
  })
})

describe('placing pieces', () => {
  it('accepts the first piece anywhere on the table', () => {
    const state = play(newGame(), place('square-roof', [4, 0, 4]))
    expect(state.pieces).toHaveLength(1)
    expect(state.pieces[0]).toMatchObject({ owner: 0 })
  })

  it('refuses a piece that hangs off the table', () => {
    expect(() => play(newGame(), place('bar-roof', [0, 0, 0]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece that overlaps another', () => {
    const state = play(newGame(), place('square-roof', [4, 0, 4]))
    expect(() => play(state, place('square-roof', [4, 0, 4]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece that touches nothing', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]))
    expect(() => play(state, place('square-roof', [6, 0, 6]))).toThrow(IllegalMoveError)
  })

  it('accepts a piece that touches another face to face', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]), place('square-roof', [3, 0, 1]))
    expect(state.pieces).toHaveLength(2)
  })

  it('refuses a piece that touches another only at a corner', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]))
    expect(() => play(state, place('square-roof', [3, 0, 3]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece whose window would face the table', () => {
    expect(() => play(newGame(), place('bar-gable', [4, 0, 4]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece that would cover an existing window', () => {
    // square-roof has a window on top of its pivot cube, so (4,1,4) must stay empty.
    const state = play(newGame(), place('square-roof', [4, 0, 4]))
    expect(() => play(state, place('square-roof', [3, 1, 4]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece whose own window would be covered', () => {
    const state = play(newGame(), place('square-roof', [4, 0, 4]))
    // The tee's stem window faces +z, into the cube that the square occupies.
    expect(() => play(state, place('tee-stem', [4, 0, 2]))).toThrow(IllegalMoveError)
  })

  it('lets a piece sit beside a window without covering it', () => {
    const state = play(newGame(), place('square-roof', [4, 0, 4]), place('square-roof', [6, 0, 4]))
    expect(state.pieces).toHaveLength(2)
  })
})

describe('turns', () => {
  it('passes the turn in seat order and wraps around', () => {
    const state = play(newGame(3), { kind: 'end_turn' }, { kind: 'end_turn' }, { kind: 'end_turn' })
    expect(kowloonRules.activePlayer(state)).toBe(0)
  })

  it('credits a piece to the seat that placed it', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]), { kind: 'end_turn' }, place('square-roof', [3, 0, 1]))
    expect(state.pieces.map(piece => piece.owner)).toEqual([0, 1])
  })

  it('takes back the newest piece placed this turn', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]), place('square-roof', [3, 0, 1]), { kind: 'undo_place' })
    expect(state.pieces).toHaveLength(1)
  })

  it('cannot take back a piece from an earlier turn', () => {
    const state = play(newGame(), place('square-roof', [1, 0, 1]), { kind: 'end_turn' })
    expect(() => play(state, { kind: 'undo_place' })).toThrow(IllegalMoveError)
  })

  it('rotates the table’s colours without ending the turn', () => {
    const state = play(newGame(), { kind: 'rotate_colors' })
    expect(state).toMatchObject({ colorShift: 1, playerIndex: 0 })
  })
})

describe('aiming a piece', () => {
  it('rests a piece on the table where it is aimed', () => {
    const origin = originForAim({ pieceId: 'tripod-peak', orientation: UNTURNED }, { cell: [3, 0, 3], normal: [0, 1, 0] })
    const lowest = Math.min(...footprintOf({ pieceId: 'tripod-peak', orientation: UNTURNED, origin }).cells.map(cell => cell[1]))
    expect(lowest).toBe(0)
  })
})

describe('cards', () => {
  const topOfDeck = (state: KowloonState) => state.cards.deck.at(-1)!
  const moveTopCard = (state: KowloonState, to: CardZone): KowloonMove => ({ kind: 'move_card', cardId: topOfDeck(state), to })

  it('deals the deck cards into the deck and the static cards face up', () => {
    const { cards } = newGame()
    const idsIn = (market: string) => CARDS.filter(card => card.market === market).map(card => card.id).sort()
    expect([...cards.deck].sort()).toEqual(idsIn('deck'))
    expect(cards.static).toEqual(idsIn('static'))
  })

  it('leaves a static card in the static market when one is taken', () => {
    const state = newGame()
    const [scaffold] = state.cards.static
    const after = play(state, { kind: 'move_card', cardId: scaffold, to: 'played' })
    expect(after.cards.static).toEqual(state.cards.static)
  })

  it('takes a distinct copy of a static card each time', () => {
    const state = newGame()
    const [scaffold] = state.cards.static
    const takeScaffold: KowloonMove = { kind: 'move_card', cardId: scaffold, to: 'hand' }
    const [first, second] = play(state, takeScaffold, takeScaffold).cards.hands[0]
    expect(findCard(first)).toBe(findCard(scaffold))
    expect(first).not.toBe(second)
  })

  it('returns a static card copy to the supply', () => {
    const state = newGame()
    const taken = play(state, { kind: 'move_card', cardId: state.cards.static[0], to: 'hand' })
    const after = play(taken, { kind: 'move_card', cardId: taken.cards.hands[0][0], to: 'static' })
    expect(after.cards).toMatchObject({ static: state.cards.static, hands: [[], []] })
  })

  it('refuses a deck card in the static market', () => {
    const state = newGame()
    expect(() => play(state, moveTopCard(state, 'static'))).toThrow(IllegalMoveError)
  })

  it('deals the same deck from the same seed', () => {
    expect(newGame().cards.deck).toEqual(newGame().cards.deck)
  })

  it('shuffles the deck without losing a card', () => {
    const before = newGame()
    const after = play(before, { kind: 'shuffle_deck' })
    expect(after.cards.deck).not.toEqual(before.cards.deck)
    expect([...after.cards.deck].sort()).toEqual([...before.cards.deck].sort())
  })

  it('deals the top of the deck to the end of the market', () => {
    const before = newGame()
    const after = play(before, moveTopCard(before, 'market'))
    expect(after.cards.market).toEqual([topOfDeck(before)])
    expect(after.cards.deck).toHaveLength(before.cards.deck.length - 1)
  })

  it('puts a card taken into the hand in the active player’s hand', () => {
    const state = play(newGame(), { kind: 'end_turn' })
    const after = play(state, moveTopCard(state, 'hand'))
    expect(after.cards.hands.map(hand => hand.length)).toEqual([0, 1])
  })

  it('plays a card from the hand face up for everyone', () => {
    const state = newGame()
    const cardId = topOfDeck(state)
    const after = play(state, moveTopCard(state, 'hand'), { kind: 'move_card', cardId, to: 'played' })
    expect(after.cards).toMatchObject({ hands: [[], []], played: [cardId] })
  })

  it('returns a card to the top of the deck', () => {
    const state = newGame()
    const cardId = topOfDeck(state)
    const after = play(state, moveTopCard(state, 'market'), { kind: 'move_card', cardId, to: 'deck' })
    expect(topOfDeck(after)).toBe(cardId)
  })

  it('cannot take a card from another player’s hand', () => {
    const state = newGame()
    const cardId = topOfDeck(state)
    const inFirstHand = play(state, moveTopCard(state, 'hand'), { kind: 'end_turn' })
    expect(() => play(inFirstHand, { kind: 'move_card', cardId, to: 'market' })).toThrow(IllegalMoveError)
  })

  it('refuses to move a card to the zone it is already in', () => {
    const state = newGame()
    expect(() => play(state, moveTopCard(state, 'deck'))).toThrow(IllegalMoveError)
  })
})

describe('points', () => {
  it('start at zero for every seat', () => {
    expect(newGame(3).points).toEqual([0, 0, 0])
  })

  it('can be added to and taken from any seat by the active player', () => {
    const state = play(newGame(), { kind: 'adjust_points', seat: 1, delta: 3 }, { kind: 'adjust_points', seat: 1, delta: -1 })
    expect(state.points).toEqual([0, 2])
  })

  it('refuse an unknown seat', () => {
    expect(() => play(newGame(), { kind: 'adjust_points', seat: 2, delta: 1 })).toThrow(IllegalMoveError)
  })
})

describe('tokens', () => {
  // square-roof at (4,0,4) has its window on top of the pivot cube, so use its other cubes' tops.
  const built = () => play(newGame(), place('square-roof', [4, 0, 4]))
  const builtSquare = (state: KowloonState): [number, number, number] => {
    const cell = footprintOf(state.pieces[0]).cells[1]
    return [cell[0], cell[1], cell[2]]
  }
  const placeToken = (square: [number, number, number]): KowloonMove => ({ kind: 'place_token', resource: 'fish', square })

  it('lie on top of a building', () => {
    const state = built()
    const after = play(state, placeToken(builtSquare(state)))
    expect(after.tokens).toEqual([{ resource: 'fish', square: builtSquare(state) }])
  })

  it('cannot lie on the bare table', () => {
    expect(() => play(newGame(), placeToken([1, 0, 1]))).toThrow(IllegalMoveError)
  })

  it('cannot share a square', () => {
    const state = built()
    expect(() => play(state, placeToken(builtSquare(state)), placeToken(builtSquare(state)))).toThrow(IllegalMoveError)
  })

  it('stay underneath a building placed over them', () => {
    const state = built()
    const [x, y, z] = builtSquare(state)
    const covered = play(state, placeToken([x, y, z]), place('square-roof', [x, y + 1, z]))
    expect(covered.tokens).toEqual([{ resource: 'fish', square: [x, y, z] }])
  })

  it('cannot go under a cube', () => {
    const state = built()
    const [x, y, z] = builtSquare(state)
    const covered = play(state, place('square-roof', [x, y + 1, z]))
    expect(() => play(covered, placeToken([x, y, z]))).toThrow(IllegalMoveError)
  })

  it('come off a building that is taken back', () => {
    const state = built()
    const after = play(state, placeToken(builtSquare(state)), { kind: 'undo_place' })
    expect(after.tokens).toEqual([])
  })

  it('can be removed', () => {
    const state = built()
    const after = play(state, placeToken(builtSquare(state)), { kind: 'remove_token', square: builtSquare(state) })
    expect(after.tokens).toEqual([])
  })
})
