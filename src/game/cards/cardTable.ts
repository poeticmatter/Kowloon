import { nextIndex } from 'game-kit/turns'
import type { CardId } from './catalog'

export const HAND_SIZE = 5

export interface CardTable {
  /** Face down; the last card is the top. */
  deck: CardId[]
  /**
   * One per seat. Only the owner's screen shows a hand, but the state is shared,
   * so a hand is hidden from other players, not secret from their browsers.
   */
  hands: CardId[][]
  /** Face up, oldest first; only the last card is shown. */
  discard: CardId[]
}

interface Shuffled {
  cards: CardId[]
  randomState: number
}

/** Fisher–Yates, drawing from the game's seeded generator so every client gets the same order. */
export function shuffleCards(cards: readonly CardId[], randomState: number): Shuffled {
  const shuffled = [...cards]
  let state = randomState
  for (let last = shuffled.length - 1; last > 0; last--) {
    const { index, nextState } = nextIndex(state, last + 1)
    state = nextState
    ;[shuffled[last], shuffled[index]] = [shuffled[index], shuffled[last]]
  }
  return { cards: shuffled, randomState: state }
}

interface DrawResult {
  cards: CardTable
  randomState: number
}

/** Deals `seat` the top card of the deck. An empty deck is first refilled by shuffling the discard pile. */
export function drawCard(table: CardTable, seat: number, randomState: number): DrawResult {
  let { deck, discard } = table
  let state = randomState
  if (deck.length === 0 && discard.length > 0) {
    const shuffled = shuffleCards(discard, state)
    deck = shuffled.cards
    discard = []
    state = shuffled.randomState
  }
  if (deck.length === 0) return { cards: table, randomState }
  const drawn = deck[deck.length - 1]
  const hands = table.hands.map((hand, handSeat) => (handSeat === seat ? [...hand, drawn] : hand))
  return { cards: { deck: deck.slice(0, -1), hands, discard }, randomState: state }
}

/** A shuffled deck with every seat dealt a full hand. */
export function dealCardTable(cardIds: readonly CardId[], seatCount: number, randomState: number): DrawResult {
  const shuffled = shuffleCards(cardIds, randomState)
  let table: CardTable = { deck: shuffled.cards, hands: Array.from({ length: seatCount }, () => []), discard: [] }
  let state = shuffled.randomState
  for (let dealt = 0; dealt < HAND_SIZE; dealt++) {
    for (let seat = 0; seat < seatCount; seat++) {
      const drawn = drawCard(table, seat, state)
      table = drawn.cards
      state = drawn.randomState
    }
  }
  return { cards: table, randomState: state }
}

/** Moves a card from `seat`'s hand to the discard pile. */
export function discardFromHand(table: CardTable, seat: number, cardId: CardId): CardTable {
  const hands = table.hands.map((hand, handSeat) => (handSeat === seat ? hand.filter(card => card !== cardId) : hand))
  return { ...table, hands, discard: [...table.discard, cardId] }
}
