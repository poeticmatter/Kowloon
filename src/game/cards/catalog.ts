export interface CardDefinition {
  name: string
}

// Placeholder deck until the real cards are designed: each entry is one physical card,
// so a card's id is its index here and duplicates are just repeated entries.
const PLACEHOLDER_DECK_SIZE = 30

export const CARDS: readonly CardDefinition[] = Array.from({ length: PLACEHOLDER_DECK_SIZE }, (_, index) => ({
  name: `Card ${index + 1}`,
}))

export type CardId = number

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < CARDS.length
}
