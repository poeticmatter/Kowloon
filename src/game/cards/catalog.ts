/** The things a player does that can set off their cards. */
export type Trigger = 'build' | 'covered' | 'take' | 'combine'

export type Effect =
  /** Score points. */
  | { kind: 'points'; amount: number }
  /** Make a piece of this size ready, if the player has one left. Counts as a take. */
  | { kind: 'take'; size: number }
  /** Make a piece of this size ready by returning smaller ready pieces, if the player can. Counts as a combine. */
  | { kind: 'combine'; size: number }

export type Passive =
  /** A card can be built with a piece one size smaller, for each of these. */
  | 'shrink'
  /** A combine makes a piece one size bigger than the pieces returned, for each of these. */
  | 'combineBonus'

export type Ability = { kind: 'triggered'; trigger: Trigger; effect: Effect } | { kind: 'passive'; passive: Passive }

export interface CardDefinition {
  id: string
  name: string
  /** The size of piece it is built with, and what it is worth at the end. */
  size: number
  ability: Ability
}

type Template = readonly [name: string, size: number, ability: Ability]

const when = (trigger: Trigger, effect: Effect): Ability => ({ kind: 'triggered', trigger, effect })
const points = (amount: number): Effect => ({ kind: 'points', amount })
const take = (size: number): Effect => ({ kind: 'take', size })
const combine = (size: number): Effect => ({ kind: 'combine', size })
const always = (passive: Passive): Ability => ({ kind: 'passive', passive })

/** Every card exists in this many copies. */
const COPIES = 2

const TEMPLATES: readonly Template[] = [
  ['Scaffold', 1, when('take', points(1))],
  ['Pantry', 1, when('build', take(1))],
  ['Pulley', 1, when('combine', points(1))],
  ['Cushion', 1, when('covered', take(1))],
  ['Squatter', 1, when('covered', points(1))],

  ['Mason', 2, when('build', points(1))],
  ['Barter', 2, when('combine', take(1))],
  ['Tenant', 2, when('covered', take(2))],
  ['Fishmonger', 2, when('take', take(1))],
  ['Lever', 2, always('combineBonus')],

  ['Landlord', 3, when('covered', points(2))],
  ['Foreman', 3, when('build', take(2))],
  ['Smith', 3, when('combine', combine(2))],
  ['Collector', 3, when('take', points(2))],
  ['Stilts', 3, always('shrink')],

  ['Syndicate', 4, when('combine', points(2))],
  ['Foundry', 4, when('take', combine(3))],
  ['Warden', 4, when('covered', take(3))],
  ['Crane', 4, when('build', take(3))],
  ['Press', 4, always('combineBonus')],

  ['Skyline', 5, when('build', points(3))],
  ['Fortress', 5, when('covered', points(3))],
  ['Exchange', 5, when('take', points(3))],
  ['Guild', 5, when('combine', points(3))],
  ['Ministry', 5, when('build', take(4))],
]

export const CARDS: readonly CardDefinition[] = TEMPLATES.flatMap(([name, size, ability], index) =>
  Array.from({ length: COPIES }, (_, copy) => ({ id: `C${String(index * COPIES + copy + 1).padStart(2, '0')}`, name, size, ability })),
)

/** A card in the market or a tableau: its catalog id. */
export type CardId = string

const CARDS_BY_ID: ReadonlyMap<CardId, CardDefinition> = new Map(CARDS.map(card => [card.id, card]))

export function findCard(cardId: CardId): CardDefinition | undefined {
  return CARDS_BY_ID.get(cardId)
}

export function isCardId(value: unknown): value is CardId {
  return typeof value === 'string' && CARDS_BY_ID.has(value)
}

export function cardsOfSize(size: number): CardDefinition[] {
  return CARDS.filter(card => card.size === size)
}

export function cardsOf(cardIds: readonly CardId[]): CardDefinition[] {
  return cardIds.flatMap(cardId => findCard(cardId) ?? [])
}

/** How many of these cards carry `passive`. */
export function countPassive(cardIds: readonly CardId[], passive: Passive): number {
  return cardsOf(cardIds).filter(card => card.ability.kind === 'passive' && card.ability.passive === passive).length
}
