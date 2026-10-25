import type { Resource } from '../resources'

export interface CardDefinition {
  id: string
  name: string
  /** What the building consumes. */
  inputs: readonly Resource[]
  /** What the building produces. */
  output: Resource
}

/** One entry per physical card, from tenth_dragon_cards_v5.csv. */
export const CARDS: readonly CardDefinition[] = [
  { id: 'C01', name: 'Squatter Floor', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C02', name: 'Back-Alley Netrunner', inputs: ['cog', 'users', 'users'], output: 'wifi' },
  { id: 'C03', name: 'Data Broker', inputs: ['cog', 'cog', 'fish'], output: 'wifi' },
  { id: 'C04', name: 'Mahjong Net Café', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C05', name: 'Rooftop Shacks', inputs: ['wifi', 'wifi', 'cog'], output: 'users' },
  { id: 'C06', name: 'Mesh Node', inputs: ['cog', 'cog', 'fish'], output: 'wifi' },
  { id: 'C07', name: 'Tea House', inputs: ['wifi', 'cog', 'cog'], output: 'fish' },
  { id: 'C08', name: 'Dried Goods', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
  { id: 'C09', name: 'Coffin Bunks', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C10', name: 'Cable Strippers', inputs: ['fish', 'users', 'users'], output: 'cog' },
  { id: 'C11', name: 'Salvage Market', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C12', name: 'Scrap Yard', inputs: ['wifi', 'wifi', 'fish'], output: 'cog' },
  { id: 'C13', name: 'Commune Loft', inputs: ['cog', 'fish', 'fish'], output: 'users' },
  { id: 'C14', name: 'Chop Shop', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C15', name: 'Battery Rebuilders', inputs: ['wifi', 'wifi', 'users'], output: 'cog' },
  { id: 'C16', name: 'Prosthetics Clinic', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C17', name: 'Family Cubicles', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C18', name: 'Line Tappers', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C19', name: 'Metal Press', inputs: ['wifi', 'wifi', 'users'], output: 'cog' },
  { id: 'C20', name: 'Drone Repair', inputs: ['wifi', 'users', 'users'], output: 'cog' },
  { id: 'C21', name: 'Rooftop Hydroponics', inputs: ['cog', 'cog', 'users'], output: 'fish' },
  { id: 'C22', name: 'Circuit Bodgers', inputs: ['wifi', 'users', 'users'], output: 'cog' },
  { id: 'C23', name: 'Fortune Algorithm', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C24', name: 'Tofu Works', inputs: ['wifi', 'cog', 'cog'], output: 'fish' },
  { id: 'C25', name: 'Plastics Mould', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C26', name: 'Pirate Broadcast', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C27', name: 'Dormitory Block', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C28', name: 'Fishball Stall', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
  { id: 'C29', name: 'Crypto Den', inputs: ['fish', 'fish', 'users'], output: 'wifi' },
  { id: 'C30', name: 'Sublet Warren', inputs: ['wifi', 'fish', 'fish'], output: 'users' },
  { id: 'C31', name: 'Stacked Flats', inputs: ['wifi', 'wifi', 'fish'], output: 'users' },
  { id: 'C32', name: 'Server Closet', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C33', name: 'Tenement Row', inputs: ['wifi', 'fish', 'fish'], output: 'users' },
  { id: 'C34', name: 'Noodle Factory', inputs: ['cog', 'cog', 'users'], output: 'fish' },
  { id: 'C35', name: 'Capsule Hostel', inputs: ['cog', 'fish', 'fish'], output: 'users' },
  { id: 'C36', name: 'Vat Protein Lab', inputs: ['wifi', 'wifi', 'cog'], output: 'fish' },
  { id: 'C37', name: 'Cold Store', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
  { id: 'C38', name: 'Signal Relay', inputs: ['fish', 'fish', 'users'], output: 'wifi' },
  { id: 'C39', name: 'Tool Lender', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C40', name: 'Sleeper Pods', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C41', name: 'Cache Vault', inputs: ['fish', 'users', 'users'], output: 'wifi' },
  { id: 'C42', name: 'Dumpling Kitchen', inputs: ['cog', 'users', 'users'], output: 'fish' },
  { id: 'C43', name: 'Congee Counter', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
  { id: 'C44', name: 'Antenna Farm', inputs: ['cog', 'fish', 'users'], output: 'wifi' },
  { id: 'C45', name: 'Night-Shift Lodging', inputs: ['wifi', 'cog', 'fish'], output: 'users' },
  { id: 'C46', name: 'Roast Goose Hall', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
  { id: 'C47', name: 'Neon Workshop', inputs: ['wifi', 'fish', 'users'], output: 'cog' },
  { id: 'C48', name: 'Night Market', inputs: ['wifi', 'cog', 'users'], output: 'fish' },
]

/** A card on the table: its catalog id. */
export type CardId = string

const CARD_IDS = new Set(CARDS.map(card => card.id))

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && CARD_IDS.has(value)
}

/**
 * The cards for a match with these resources. Cards that use a resource left out of the match
 * swap it for one of the others, spread round so the deck keeps its variety.
 */
export function cardsFor(resources: readonly Resource[]): readonly CardDefinition[] {
  const inPlay = new Set(resources)
  return CARDS.map((card, index) => {
    let swaps = 0
    const swap = (resource: Resource): Resource => (inPlay.has(resource) ? resource : resources[(index + swaps++) % resources.length])
    return { ...card, inputs: card.inputs.map(swap), output: swap(card.output) }
  })
}

const cardsByResources = new Map<string, ReadonlyMap<CardId, CardDefinition>>()

/** The card with this id as it reads in a match with these resources. */
export function findCard(cardId: CardId, resources: readonly Resource[]): CardDefinition | undefined {
  const key = resources.join(',')
  let cards = cardsByResources.get(key)
  if (!cards) {
    cards = new Map(cardsFor(resources).map(card => [card.id, card]))
    cardsByResources.set(key, cards)
  }
  return cards.get(cardId)
}
