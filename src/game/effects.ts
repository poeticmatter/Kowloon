import { countPassive, findCard, type CardId, type Effect, type Trigger } from './cards/catalog'
import { countOf, findPiecesAddingTo, withCount } from './supply'
import type { SeatState } from './types'

// Triggers: something a player does sets off every card of theirs with that trigger, and the
// effects can set off more. A card fires at most once per action, which keeps chains finite.

interface TriggerEvent {
  seat: number
  trigger: Trigger
}

/** What one effect does to one seat, and the trigger it sets off, if any. */
interface EffectResult {
  seat: SeatState
  caused: Trigger | null
}

function applyEffect(seat: SeatState, effect: Effect): EffectResult {
  switch (effect.kind) {
    case 'points':
      return { seat: { ...seat, points: seat.points + effect.amount }, caused: null }
    case 'take': {
      if (countOf(seat.unready, effect.size) < 1) return { seat, caused: null }
      return {
        seat: { ...seat, unready: withCount(seat.unready, effect.size, -1), ready: withCount(seat.ready, effect.size, 1) },
        caused: 'take',
      }
    }
    case 'combine': {
      if (countOf(seat.unready, effect.size) < 1) return { seat, caused: null }
      const returned = findPiecesAddingTo(seat.ready, effect.size, effect.size)
      if (!returned) return { seat, caused: null }
      return { seat: combined(seat, returned, effect.size), caused: 'combine' }
    }
  }
}

/** The seat after returning ready pieces of the given sizes to make one piece of `size` ready. */
export function combined(seat: SeatState, returned: readonly number[], size: number): SeatState {
  let { ready, unready } = seat
  for (const returnedSize of returned) {
    ready = withCount(ready, returnedSize, -1)
    unready = withCount(unready, returnedSize, 1)
  }
  return { ...seat, ready: withCount(ready, size, 1), unready: withCount(unready, size, -1) }
}

/** The seat after making one piece of `size` ready. */
export function taken(seat: SeatState, size: number): SeatState {
  return { ...seat, ready: withCount(seat.ready, size, 1), unready: withCount(seat.unready, size, -1) }
}

/**
 * Pieces the seat could return to make a piece of `size` ready by combining, or null if it can't.
 * Each combineBonus card lets the pieces add up to one less.
 */
export function combinationFor(seat: SeatState, size: number): number[] | null {
  if (countOf(seat.unready, size) < 1) return null
  const bonus = countPassive(seat.tableau, 'combineBonus')
  for (let sum = Math.max(2, size - bonus); sum <= size; sum++) {
    const found = findPiecesAddingTo(seat.ready, sum, size)
    if (found) return found
  }
  return null
}

function firesOn(cardId: CardId, trigger: Trigger): Effect | null {
  const ability = findCard(cardId)?.ability
  return ability?.kind === 'triggered' && ability.trigger === trigger ? ability.effect : null
}

/**
 * Sets off `starting` triggers in order, then whatever they cause, until nothing more happens.
 * Cards fire in the order they were built.
 */
export function resolveTriggers(seats: readonly SeatState[], starting: readonly TriggerEvent[]): SeatState[] {
  let current = [...seats]
  const queue = [...starting]
  const fired = new Set<CardId>()
  for (let next = 0; next < queue.length; next++) {
    const { seat, trigger } = queue[next]
    for (const cardId of current[seat].tableau) {
      const effect = fired.has(cardId) ? null : firesOn(cardId, trigger)
      if (!effect) continue
      fired.add(cardId)
      const result = applyEffect(current[seat], effect)
      current = current.map((existing, index) => (index === seat ? result.seat : existing))
      if (result.caused) queue.push({ seat, trigger: result.caused })
    }
  }
  return current
}
