import { PIECE_SIZES } from './catalog'
import { countPassive, findCard, type CardId, type Effect, type Trigger } from './cards/catalog'
import { findPiecesAddingTo, firstShapeOfSize, sizeCountsOf, withShape, type ShapeCounts } from './supply'
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
      const gained = gainedPiece(seat, effect.size)
      return gained === null ? { seat, caused: null } : { seat: taken(seat, gained), caused: 'take' }
    }
    case 'combine': {
      const made = firstShapeOfSize(seat.unready, effect.size)
      const sizes = findPiecesAddingTo(sizeCountsOf(seat.ready), effect.size, effect.size)
      if (made === null || sizes === null) return { seat, caused: null }
      return { seat: combined(seat, shapesOfSizes(seat.ready, sizes), made), caused: 'combine' }
    }
  }
}

/** Shapes the seat has ready, one for each of the sizes, taking the first of each size in catalog order. */
function shapesOfSizes(ready: ShapeCounts, sizes: readonly number[]): string[] {
  let remaining = ready
  return sizes.flatMap(size => {
    const pieceId = firstShapeOfSize(remaining, size)
    if (pieceId === null) return []
    remaining = withShape(remaining, pieceId, -1)
    return pieceId
  })
}

/** The seat after returning the ready pieces `returned` to make a piece of shape `pieceId` ready. */
export function combined(seat: SeatState, returned: readonly string[], pieceId: string): SeatState {
  let { ready, unready } = seat
  for (const returnedId of returned) {
    ready = withShape(ready, returnedId, -1)
    unready = withShape(unready, returnedId, 1)
  }
  return { ...seat, ready: withShape(ready, pieceId, 1), unready: withShape(unready, pieceId, -1) }
}

/**
 * The piece a seat gains when it takes `size`: a piece of that size, or of the next size up that it
 * has left if it has none (the first shape in catalog order if there is a choice), or null if it has
 * nothing of that size or larger.
 */
export function gainedPiece(seat: SeatState, size: number): string | null {
  for (const candidate of PIECE_SIZES.filter(sizeOption => sizeOption >= size)) {
    const pieceId = firstShapeOfSize(seat.unready, candidate)
    if (pieceId !== null) return pieceId
  }
  return null
}

/** The seat after making the piece `pieceId` ready. */
export function taken(seat: SeatState, pieceId: string): SeatState {
  return { ...seat, ready: withShape(seat.ready, pieceId, 1), unready: withShape(seat.unready, pieceId, -1) }
}

/**
 * Pieces the seat could return to make a piece of `size` ready by combining, or null if it can't.
 * Each combineBonus card lets the pieces add up to one less.
 */
export function combinationFor(seat: SeatState, size: number): number[] | null {
  if (firstShapeOfSize(seat.unready, size) === null) return null
  const bonus = countPassive(seat.tableau, 'combineBonus')
  for (let sum = Math.max(2, size - bonus); sum <= size; sum++) {
    const found = findPiecesAddingTo(sizeCountsOf(seat.ready), sum, size)
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
