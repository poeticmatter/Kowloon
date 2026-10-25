import { nextIndex } from 'game-kit/turns'
import type { CardId } from './catalog'

// Where every card is. Like the buildings, the cards are a sandbox: any card may go to any
// zone, and nothing happens when it gets there.

export type CardZone = 'deck' | 'market' | 'discard'

export const CARD_ZONES: readonly CardZone[] = ['deck', 'market', 'discard']

export interface CardTable {
  /** Face down; the last card is the top. */
  deck: CardId[]
  /** Face up, in the order they were added. */
  market: CardId[]
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

export function newCardTable(deck: CardId[]): CardTable {
  return { deck, market: [], discard: [] }
}

/** The zone holding `cardId`, or null if it isn't on the table. */
export function locateCard(table: CardTable, cardId: CardId): CardZone | null {
  return CARD_ZONES.find(zone => table[zone].includes(cardId)) ?? null
}

export interface CardTransfer {
  cardId: CardId
  from: CardZone
  to: CardZone
}

/** Takes the card out of `from` and puts it on the end of `to` (the top, for the deck or the discard). */
export function transferCard(table: CardTable, { cardId, from, to }: CardTransfer): CardTable {
  const taken = { ...table, [from]: table[from].filter(card => card !== cardId) }
  return { ...taken, [to]: [...taken[to], cardId] }
}
