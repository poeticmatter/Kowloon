import { nextIndex } from 'game-kit/turns'
import { PIECE_SIZES } from '../catalog'
import { cardsOfSize, findCard, type CardId } from './catalog'

/** How many cards of each size are face up. */
export const MARKET_ROW_SIZE = 3

export interface Market {
  /** The face-up cards of each size, indexed by size - 1. */
  rows: CardId[][]
  /** Face down, indexed by size - 1; the last card is the top. */
  decks: CardId[][]
}

/** Fisher–Yates, drawing from the game's seeded generator so every client gets the same order. */
function shuffle<T>(items: readonly T[], randomState: number): { items: T[]; randomState: number } {
  const shuffled = [...items]
  let state = randomState
  for (let last = shuffled.length - 1; last > 0; last--) {
    const { index, nextState } = nextIndex(state, last + 1)
    state = nextState
    ;[shuffled[last], shuffled[index]] = [shuffled[index], shuffled[last]]
  }
  return { items: shuffled, randomState: state }
}

/** Tops `row` up from the top of `deck`, as far as the deck goes. */
function refilled(row: CardId[], deck: CardId[]): { row: CardId[]; deck: CardId[] } {
  const missing = Math.max(0, Math.min(MARKET_ROW_SIZE - row.length, deck.length))
  return { row: [...row, ...deck.slice(deck.length - missing).reverse()], deck: deck.slice(0, deck.length - missing) }
}

export function dealMarket(randomState: number): { market: Market; randomState: number } {
  let state = randomState
  const rows: CardId[][] = []
  const decks: CardId[][] = []
  for (const size of PIECE_SIZES) {
    const shuffled = shuffle(cardsOfSize(size).map(card => card.id), state)
    state = shuffled.randomState
    const { row, deck } = refilled([], shuffled.items)
    rows.push(row)
    decks.push(deck)
  }
  return { market: { rows, decks }, randomState: state }
}

export function marketCards(market: Market): CardId[] {
  return market.rows.flat()
}

export function isInMarket(market: Market, cardId: CardId): boolean {
  return marketCards(market).includes(cardId)
}

/** Takes the card out of its row and turns up the next of that size, if the deck has one. */
export function takeFromMarket(market: Market, cardId: CardId): Market {
  const size = findCard(cardId)?.size
  if (size === undefined) return market
  const rowIndex = size - 1
  const { row, deck } = refilled(
    market.rows[rowIndex].filter(candidate => candidate !== cardId),
    market.decks[rowIndex],
  )
  return {
    rows: market.rows.map((existing, index) => (index === rowIndex ? row : existing)),
    decks: market.decks.map((existing, index) => (index === rowIndex ? deck : existing)),
  }
}
