import type { Resource } from '../resources'

export interface CardDefinition {
  id: string
  name: string
  /** "static" cards sit face up in their own row from the start; "deck" cards are shuffled into the deck. */
  market: 'static' | 'deck'
  /** What the building consumes. */
  inputs: readonly Resource[]
  /** What the building produces. */
  outputs: readonly Resource[]
  points: number
}

/** One entry per physical card, from kowloon_cards.csv. */
export const CARDS: readonly CardDefinition[] = [
  { id: 'S1', name: 'Scaffold (Fish)', market: 'static', inputs: [], outputs: ['fish', 'fish'], points: 0 },
  { id: 'S2', name: 'Scaffold (Wrench)', market: 'static', inputs: [], outputs: ['wrench', 'wrench'], points: 0 },
  { id: 'S3', name: 'Scaffold (Flame)', market: 'static', inputs: [], outputs: ['flame', 'flame'], points: 0 },
  { id: 'S4', name: 'Scaffold (Package)', market: 'static', inputs: [], outputs: ['package', 'package'], points: 0 },
  { id: 'C01', name: 'Fishball Stall', market: 'deck', inputs: ['flame', 'package', 'wrench'], outputs: ['fish', 'fish'], points: 5 },
  { id: 'C02', name: 'Noodle Factory', market: 'deck', inputs: ['flame', 'wrench'], outputs: ['fish', 'package', 'package'], points: 2 },
  { id: 'C03', name: 'Back-Alley Dentist', market: 'deck', inputs: ['flame'], outputs: ['wrench'], points: 2 },
  { id: 'C04', name: 'Mahjong Parlour', market: 'deck', inputs: [], outputs: ['fish', 'flame', 'wrench'], points: 0 },
  { id: 'C05', name: 'Tailor', market: 'deck', inputs: ['fish', 'flame', 'package'], outputs: ['wrench'], points: 6 },
  { id: 'C06', name: 'Herbalist', market: 'deck', inputs: ['fish', 'package', 'wrench'], outputs: [], points: 7 },
  { id: 'C07', name: 'Rooftop Shrine', market: 'deck', inputs: ['fish'], outputs: ['package'], points: 2 },
  { id: 'C08', name: 'Tea House', market: 'deck', inputs: ['fish', 'wrench'], outputs: ['flame', 'package'], points: 3 },
  { id: 'C09', name: 'Barber', market: 'deck', inputs: ['wrench'], outputs: ['fish', 'flame', 'package'], points: 0 },
  { id: 'C10', name: 'Print Shop', market: 'deck', inputs: ['wrench'], outputs: ['fish', 'flame'], points: 1 },
  { id: 'C11', name: 'Bakery', market: 'deck', inputs: ['fish', 'flame', 'package'], outputs: ['wrench'], points: 6 },
  { id: 'C12', name: 'Metal Shop', market: 'deck', inputs: ['fish', 'flame'], outputs: ['package', 'wrench'], points: 3 },
  { id: 'C13', name: 'Rice Merchant', market: 'deck', inputs: ['fish', 'flame', 'wrench'], outputs: ['package', 'package', 'package'], points: 4 },
  { id: 'C14', name: 'Laundry', market: 'deck', inputs: ['flame'], outputs: ['fish', 'package', 'wrench'], points: 0 },
  { id: 'C15', name: 'Candle Maker', market: 'deck', inputs: [], outputs: ['fish', 'flame'], points: 0 },
  { id: 'C16', name: 'Clinic', market: 'deck', inputs: ['flame', 'wrench'], outputs: ['fish'], points: 4 },
  { id: 'C17', name: 'Night School', market: 'deck', inputs: ['flame', 'package', 'wrench'], outputs: ['fish'], points: 6 },
  { id: 'C18', name: 'Pawn Shop', market: 'deck', inputs: ['wrench'], outputs: [], points: 3 },
  { id: 'C19', name: 'Tofu Maker', market: 'deck', inputs: ['fish', 'wrench'], outputs: ['flame', 'package'], points: 3 },
  { id: 'C20', name: 'Sign Painter', market: 'deck', inputs: ['flame', 'package', 'wrench'], outputs: ['fish', 'fish', 'fish'], points: 4 },
  { id: 'C21', name: 'Radio Repair', market: 'deck', inputs: ['package'], outputs: ['flame', 'wrench'], points: 1 },
  { id: 'C22', name: 'Cobbler', market: 'deck', inputs: [], outputs: ['flame', 'wrench'], points: 0 },
  { id: 'C23', name: 'Spice Seller', market: 'deck', inputs: ['fish', 'package', 'wrench'], outputs: ['flame', 'flame'], points: 5 },
  { id: 'C24', name: 'Rope Maker', market: 'deck', inputs: ['package'], outputs: [], points: 3 },
  { id: 'C25', name: 'Family Flat', market: 'deck', inputs: ['fish', 'flame'], outputs: [], points: 5 },
  { id: 'C26', name: 'Shared Kitchen', market: 'deck', inputs: [], outputs: ['flame', 'wrench'], points: 0 },
  { id: 'C27', name: 'Lantern Maker', market: 'deck', inputs: ['flame', 'package'], outputs: ['wrench'], points: 4 },
  { id: 'C28', name: 'Cold Store', market: 'deck', inputs: ['fish'], outputs: ['flame', 'package'], points: 1 },
  { id: 'C29', name: 'Pharmacy', market: 'deck', inputs: ['fish', 'flame', 'wrench'], outputs: ['package', 'package'], points: 5 },
  { id: 'C30', name: 'Bookbinder', market: 'deck', inputs: ['fish', 'package'], outputs: [], points: 5 },
  { id: 'C31', name: 'Seamstress', market: 'deck', inputs: ['fish', 'flame', 'package'], outputs: [], points: 7 },
  { id: 'C32', name: 'Rooftop Garden', market: 'deck', inputs: [], outputs: ['fish', 'flame', 'wrench'], points: 0 },
  { id: 'C33', name: 'Pigeon Loft', market: 'deck', inputs: [], outputs: ['flame', 'wrench'], points: 0 },
  { id: 'C34', name: 'Fortune Teller', market: 'deck', inputs: ['fish', 'package'], outputs: ['flame', 'wrench', 'wrench'], points: 2 },
  { id: 'C35', name: 'Watchmaker', market: 'deck', inputs: ['package'], outputs: ['fish'], points: 2 },
  { id: 'C36', name: 'Dumpling Kitchen', market: 'deck', inputs: ['package', 'wrench'], outputs: ['wrench'], points: 4 },
]

/**
 * A card on the table: a catalog id for a single card, or "<catalog id>#<n>" for a copy taken
 * from the static market's endless supply.
 */
export type CardId = string

const COPY_SEPARATOR = '#'

const CARDS_BY_ID = new Map(CARDS.map(card => [card.id, card]))

export function copyCardId(definitionId: string, copyNumber: number): CardId {
  return `${definitionId}${COPY_SEPARATOR}${copyNumber}`
}

export function findCard(cardId: CardId): CardDefinition | undefined {
  return CARDS_BY_ID.get(cardId.split(COPY_SEPARATOR)[0])
}

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && findCard(value) !== undefined
}
