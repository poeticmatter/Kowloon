import { IllegalMoveError, nextIndex, type GameRules } from 'game-kit/turns'
import type { PigMove, PigSettings, PigState } from './types'

// Pig: on your turn, roll as often as you like, adding each roll to your turn total,
// then hold to bank it. Roll a 1 and you lose the turn total and your turn.

const DIE_FACES = 6
export const BUST_FACE = 1

function nextPlayer(state: PigState): number {
  return (state.playerIndex + 1) % state.scores.length
}

function roll(state: PigState): PigState {
  const { index, nextState } = nextIndex(state.randomState, DIE_FACES)
  const value = index + 1
  const rolled = { ...state, randomState: nextState, lastRoll: { player: state.playerIndex, value } }
  if (value === BUST_FACE) return { ...rolled, turnTotal: 0, playerIndex: nextPlayer(state) }
  return { ...rolled, turnTotal: state.turnTotal + value }
}

function hold(state: PigState): PigState {
  if (state.turnTotal === 0) throw new IllegalMoveError('Roll at least once before holding')
  const score = state.scores[state.playerIndex] + state.turnTotal
  const scores = state.scores.map((current, index) => (index === state.playerIndex ? score : current))
  if (score >= state.targetScore) return { ...state, scores, turnTotal: 0, winner: state.playerIndex }
  return { ...state, scores, turnTotal: 0, playerIndex: nextPlayer(state) }
}

export const pigRules: GameRules<PigSettings, PigState, PigMove> = {
  createInitialState({ settings, playerCount, seed }) {
    return {
      targetScore: settings.targetScore,
      scores: Array.from({ length: playerCount }, () => 0),
      playerIndex: 0,
      turnTotal: 0,
      lastRoll: null,
      randomState: seed,
      winner: null,
    }
  },

  activePlayer: state => (state.winner === null ? state.playerIndex : null),

  applyMove(state, move) {
    if (state.winner !== null) throw new IllegalMoveError('The game is over')
    return move.kind === 'roll' ? roll(state) : hold(state)
  },
}
