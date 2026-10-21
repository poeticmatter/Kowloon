export interface PigSettings {
  /** First to this many banked points wins. */
  targetScore: number
}

export interface LastRoll {
  player: number
  value: number
}

export interface PigState {
  targetScore: number
  /** Banked points, in seat order. */
  scores: number[]
  /** Whose turn it is. */
  playerIndex: number
  /** Points rolled this turn, lost on a 1, banked on a hold. */
  turnTotal: number
  lastRoll: LastRoll | null
  /** Seeded generator state (GameKit's nextIndex), so every client rolls the same dice. */
  randomState: number
  winner: number | null
}

export type PigMove = { kind: 'roll' } | { kind: 'hold' }
