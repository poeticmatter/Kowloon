import { nextIndex } from 'game-kit/turns'
import { copyCardId, type CardId } from './catalog'

// Where every card is. Like the buildings, the cards are a sandbox: any card the active
// player can reach may go to any zone, and nothing happens when it gets there.

export type CardZone = 'static' | 'deck' | 'market' | 'hand' | 'played'

export const CARD_ZONES: readonly CardZone[] = ['static', 'deck', 'market', 'hand', 'played']

export interface CardTable {
  /**
   * The static market: face up, never shuffled into the deck, and an endless supply.
   * Taking a card leaves it here and takes a copy; a copy put back returns to the supply.
   */
  static: CardId[]
  /** How many copies have been taken from the static market, to number the next one. */
  copiesMade: number
  /** Face down; the last card is the top. */
  deck: CardId[]
  /** Face up, in the order they were added. */
  market: CardId[]
  /**
   * One per seat. Only the owner's screen shows a hand, but the state is shared,
   * so a hand is hidden from other players, not secret from their browsers.
   */
  hands: CardId[][]
  /** Face up, oldest first. */
  played: CardId[]
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

export function newCardTable(staticCards: CardId[], deck: CardId[], seatCount: number): CardTable {
  return { static: staticCards, copiesMade: 0, deck, market: [], hands: Array.from({ length: seatCount }, () => []), played: [] }
}

/** The pile a zone means for `seat`: "hand" is always that seat's own hand. */
export function pileOf(table: CardTable, zone: CardZone, seat: number): readonly CardId[] {
  return zone === 'hand' ? table.hands[seat] : table[zone]
}

function withPile(table: CardTable, zone: CardZone, seat: number, pile: CardId[]): CardTable {
  if (zone !== 'hand') return { ...table, [zone]: pile }
  return { ...table, hands: table.hands.map((hand, handSeat) => (handSeat === seat ? pile : hand)) }
}

/** The zone holding `cardId` that `seat` can reach, or null if it's elsewhere (another seat's hand). */
export function locateCard(table: CardTable, cardId: CardId, seat: number): CardZone | null {
  return CARD_ZONES.find(zone => pileOf(table, zone, seat).includes(cardId)) ?? null
}

export interface CardTransfer {
  cardId: CardId
  from: CardZone
  to: CardZone
  seat: number
}

interface TakenCard {
  table: CardTable
  /** The card that moves: the one taken, or a fresh copy from the static market. */
  movedId: CardId
}

function takeCard(table: CardTable, { cardId, from, seat }: CardTransfer): TakenCard {
  if (from === 'static') {
    const copiesMade = table.copiesMade + 1
    return { table: { ...table, copiesMade }, movedId: copyCardId(cardId, copiesMade) }
  }
  return { table: withPile(table, from, seat, pileOf(table, from, seat).filter(card => card !== cardId)), movedId: cardId }
}

/**
 * Takes the card out of `from` and puts it on the end of `to` (the top, for the deck). A card
 * taken from the static market is a new copy, and a card put back there leaves the table.
 */
export function transferCard(table: CardTable, transfer: CardTransfer): CardTable {
  const { table: taken, movedId } = takeCard(table, transfer)
  const { to, seat } = transfer
  if (to === 'static') return taken
  return withPile(taken, to, seat, [...pileOf(taken, to, seat), movedId])
}
