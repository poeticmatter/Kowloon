import { describe, expect, it } from 'vitest'
import { IllegalMoveError, nextIndex } from 'game-kit/turns'
import { pigRules } from './rules'
import type { PigMove, PigState } from './types'

// An example of testing a game's rules: they're pure functions, so no browser or
// network is needed. Randomness is seeded, so a test can pick the roll it wants.

const DIE_FACES = 6

/** The first seed whose next roll shows `face`. */
function seedRolling(face: number): number {
  let seed = 0
  while (nextIndex(seed, DIE_FACES).index + 1 !== face) seed++
  return seed
}

function newGame(overrides: Partial<PigState> = {}): PigState {
  const state = pigRules.createInitialState({ settings: { targetScore: 20 }, playerCount: 3, seed: 1 })
  return { ...state, ...overrides }
}

const roll: PigMove = { kind: 'roll' }
const hold: PigMove = { kind: 'hold' }

describe('Pig', () => {
  it('adds a roll to the turn total', () => {
    const state = pigRules.applyMove(newGame({ randomState: seedRolling(4) }), roll)
    expect(state.turnTotal).toBe(4)
  })

  it('loses the turn total and the turn on a 1', () => {
    const state = pigRules.applyMove(newGame({ turnTotal: 9, randomState: seedRolling(1) }), roll)
    expect(state).toMatchObject({ turnTotal: 0, playerIndex: 1 })
  })

  it('banks the turn total on a hold and passes the turn', () => {
    const state = pigRules.applyMove(newGame({ turnTotal: 7 }), hold)
    expect(state).toMatchObject({ scores: [7, 0, 0], turnTotal: 0, playerIndex: 1 })
  })

  it('refuses a hold before any roll', () => {
    expect(() => pigRules.applyMove(newGame(), hold)).toThrow(IllegalMoveError)
  })

  it('wins on reaching the target and stops waiting for anyone', () => {
    const state = pigRules.applyMove(newGame({ scores: [15, 0, 0], turnTotal: 6 }), hold)
    expect(state.winner).toBe(0)
    expect(pigRules.activePlayer(state)).toBeNull()
  })

  it('replays the same moves to the same game', () => {
    const moves: PigMove[] = [roll, roll, roll, hold, roll, roll]
    const play = () => moves.reduce((state, move) => (pigRules.activePlayer(state) === null ? state : safeApply(state, move)), newGame())
    expect(play()).toEqual(play())
  })
})

/** Holding with nothing at stake is illegal; for the replay test, roll instead. */
function safeApply(state: PigState, move: PigMove): PigState {
  return pigRules.applyMove(state, move.kind === 'hold' && state.turnTotal === 0 ? roll : move)
}
