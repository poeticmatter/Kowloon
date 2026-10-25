import { describe, expect, it } from 'vitest'
import { IllegalMoveError } from 'game-kit/turns'
import type { CardZone } from './cards/cardTable'
import { CARDS } from './cards/catalog'
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

  it.each(PIECES.map(piece => [piece.id, piece] as const))('%s is four cubes with outward windows facing different ways', (_id, piece) => {
    const cellKeys = new Set(piece.cells.map(vecKey))
    expect(cellKeys.size).toBe(4)
    expect(piece.cells[0]).toEqual([0, 0, 0])
    expect(piece.windows.length).toBeGreaterThanOrEqual(1)
    expect(piece.windows.length).toBeLessThanOrEqual(4)
    for (const window of piece.windows) {
      const front = windowFront({ cell: piece.cells[window.cell], normal: window.normal })
      expect(cellKeys.has(vecKey(front))).toBe(false)
    }
    expect(new Set(piece.windows.map(window => vecKey(window.normal))).size).toBe(piece.windows.length)
  })

  it.each([
    ['bar', 4],
    ['square', 2],
    ['tee', 2],
    ['ell', 2],
    ['skew', 2],
  ])('gives the flat %s a window on each of its flat sides', (pieceId, windowCount) => {
    const piece = PIECES.find(candidate => candidate.id === pieceId)!
    expect(piece.windows).toHaveLength(windowCount)
    // The four-cube layer lies in y = 0, so its flat sides are up and down; the bar adds its two long sides.
    const normals = new Set(piece.windows.map(window => vecKey(window.normal)))
    expect(normals.has(vecKey([0, 1, 0]))).toBe(true)
    expect(normals.has(vecKey([0, -1, 0]))).toBe(true)
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
    const state = play(newGame(), place('tripod-peak', [4, 0, 4]))
    expect(state.pieces).toHaveLength(1)
    expect(state.pieces[0]).toMatchObject({ owner: 0 })
  })

  it('refuses a piece that hangs off the table', () => {
    expect(() => play(newGame(), place('tripod-peak', [-1, 0, 0]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece that overlaps another', () => {
    const state = play(newGame(), place('tripod-peak', [4, 0, 4]))
    expect(() => play(state, place('tripod-peak', [4, 0, 4]))).toThrow(IllegalMoveError)
  })

  it('refuses a piece that touches nothing', () => {
    const state = play(newGame(), place('tripod-peak', [1, 0, 1]))
    expect(() => play(state, place('tripod-peak', [6, 0, 6]))).toThrow(IllegalMoveError)
  })

  it('accepts a piece that touches another face to face', () => {
    const state = play(newGame(), place('tripod-peak', [1, 0, 1]), place('tripod-peak', [3, 0, 1]))
    expect(state.pieces).toHaveLength(2)
  })

  it('refuses a piece that touches another only at a corner', () => {
    const state = play(newGame(), place('tripod-peak', [1, 0, 1]))
    expect(() => play(state, place('tripod-peak', [3, 0, 3]))).toThrow(IllegalMoveError)
  })

  it('refuses a flat piece lying on the table, since its underside has a window', () => {
    expect(() => play(newGame(), place('square', [4, 0, 4]))).toThrow('A window can’t face the table.')
  })

  it('refuses a piece that would cover an existing window', () => {
    // The tripod's window is on top of its peak at (4,1,4), so (4,2,4) must stay empty.
    const state = play(newGame(), place('tripod-peak', [4, 0, 4]))
    expect(() => play(state, place('tripod-peak', [3, 2, 4]))).toThrow('This piece would cover a window.')
  })

  it('refuses a piece whose own window would be covered', () => {
    const state = play(newGame(), place('tripod-peak', [4, 0, 4]))
    // The screw's end window faces −x, into the tripod's leg at (4,0,5).
    expect(() => play(state, place('left-screw-end', [6, 0, 5]))).toThrow('A window of this piece would be covered.')
  })

  it('lets a piece sit beside a window without covering it', () => {
    const state = play(newGame(), place('tripod-peak', [4, 0, 4]), place('tripod-peak', [6, 0, 4]))
    expect(state.pieces).toHaveLength(2)
  })
})

describe('turns', () => {
  it('passes the turn in seat order and wraps around', () => {
    const state = play(newGame(3), { kind: 'end_turn' }, { kind: 'end_turn' }, { kind: 'end_turn' })
    expect(kowloonRules.activePlayer(state)).toBe(0)
  })

  it('credits a piece to the seat that placed it', () => {
    const state = play(newGame(), place('tripod-peak', [1, 0, 1]), { kind: 'end_turn' }, place('tripod-peak', [3, 0, 1]))
    expect(state.pieces.map(piece => piece.owner)).toEqual([0, 1])
  })

  it('lets a placed piece be undone', () => {
    expect(kowloonRules.irreversibleReason?.(newGame(), place('tripod-peak', [1, 0, 1]))).toBeNull()
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

  it('deals every card into the deck', () => {
    const { cards } = newGame()
    expect([...cards.deck].sort()).toEqual(CARDS.map(card => card.id).sort())
    expect(cards).toMatchObject({ market: [], discard: [] })
  })

  it('deals the same deck from the same seed', () => {
    expect(newGame().cards).toEqual(newGame().cards)
  })

  it('shuffles the deck without losing a card', () => {
    const before = newGame()
    const after = play(before, { kind: 'shuffle_deck' })
    expect(after.cards.deck).not.toEqual(before.cards.deck)
    expect([...after.cards.deck].sort()).toEqual([...before.cards.deck].sort())
  })

  it('warns that a shuffle can’t be undone', () => {
    expect(kowloonRules.irreversibleReason?.(newGame(), { kind: 'shuffle_deck' })).toEqual(expect.any(String))
  })

  it('deals the top of the deck to the end of the market', () => {
    const before = newGame()
    const after = play(before, moveTopCard(before, 'market'))
    expect(after.cards.market).toEqual([topOfDeck(before)])
    expect(after.cards.deck).toHaveLength(before.cards.deck.length - 1)
  })

  it('puts the newest discard last', () => {
    const before = newGame()
    const [second, first] = [...before.cards.deck].reverse().slice(0, 2).reverse()
    const after = play(before, { kind: 'move_card', cardId: first, to: 'discard' }, { kind: 'move_card', cardId: second, to: 'discard' })
    expect(after.cards.discard).toEqual([first, second])
  })

  it('returns a card to the top of the deck', () => {
    const state = newGame()
    const cardId = topOfDeck(state)
    const after = play(state, moveTopCard(state, 'market'), { kind: 'move_card', cardId, to: 'deck' })
    expect(topOfDeck(after)).toBe(cardId)
  })

  it('refuses to move a card to the zone it is already in', () => {
    const state = newGame()
    expect(() => play(state, moveTopCard(state, 'deck'))).toThrow(IllegalMoveError)
  })

  it('refuses a card that is not on the table', () => {
    expect(() => play(newGame(), { kind: 'move_card', cardId: 'nope', to: 'market' })).toThrow(IllegalMoveError)
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
  const buildingTokens = (state: KowloonState) => state.tokens.filter(token => token.square[1] >= 0)

  it('start scattered, one per square of the table', () => {
    const state = newGame()
    expect(state.tokens).toHaveLength(100)
    expect(state.tokens.every(token => token.square[1] === -1)).toBe(true)
  })

  it('start the same for the same seed', () => {
    expect(newGame().tokens).toEqual(newGame().tokens)
  })

  it('can be picked up off the table', () => {
    const state = newGame()
    const after = play(state, { kind: 'remove_token', square: state.tokens[0].square })
    expect(after.tokens).toHaveLength(99)
  })

  // square-roof at (4,0,4) has its window on top of the pivot cube, so use its other cubes' tops.
  const built = () => play(newGame(), place('tripod-peak', [4, 0, 4]))
  const builtSquare = (state: KowloonState): [number, number, number] => {
    const cell = footprintOf(state.pieces[0]).cells[1]
    return [cell[0], cell[1], cell[2]]
  }
  const placeToken = (square: [number, number, number]): KowloonMove => ({ kind: 'place_token', resource: 'fish', square })

  it('lie on top of a building', () => {
    const state = built()
    const after = play(state, placeToken(builtSquare(state)))
    expect(buildingTokens(after)).toEqual([{ resource: 'fish', square: builtSquare(state) }])
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
    const covered = play(state, placeToken([x, y, z]), place('tripod-peak', [x, y + 1, z]))
    expect(buildingTokens(covered)).toEqual([{ resource: 'fish', square: [x, y, z] }])
  })

  it('cannot go under a cube', () => {
    const state = built()
    const [x, y, z] = builtSquare(state)
    const covered = play(state, place('tripod-peak', [x, y + 1, z]))
    expect(() => play(covered, placeToken([x, y, z]))).toThrow(IllegalMoveError)
  })

  it('can be removed', () => {
    const state = built()
    const after = play(state, placeToken(builtSquare(state)), { kind: 'remove_token', square: builtSquare(state) })
    expect(buildingTokens(after)).toEqual([])
  })
})
