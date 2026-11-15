import { PIECES } from './catalog'
import type { CardDefinition } from './cards/catalog'
import { addVec, ROTATION_COUNT, UP, vecKey, type Vec3 } from './geometry'
import { footprintKey, footprintOf, MAX_HEIGHT, placementProblem, supportOf, type BuiltTable, type Footprint } from './placement'
import { missingResources, RESOURCE_NAMES, type Resource } from './resources'
import type { PlacedToken } from './tokens'
import type { Placement } from './types'

// Playing a turn: a card goes with a building. The card names the three resources the building
// must be resting on; the building then lays the card's output on each of its uncovered top faces.

/** The tokens lying under the bottom faces of a building put down at `footprint`. */
export function tokensUnder(table: BuiltTable, footprint: Footprint): PlacedToken[] {
  const { contacts } = supportOf(table, footprint)
  return contacts.flatMap(contact => table.tokens.get(vecKey(contact)) ?? [])
}

/** Why the tokens under a building can't pay for `card`, or null if they can. */
export function inputProblem(card: CardDefinition, tokensBelow: readonly PlacedToken[]): string | null {
  const missing = missingResources(card.inputs, tokensBelow.map(token => token.resource))
  if (missing.length === 0) return null
  return `${card.name} needs ${describeResources(card.inputs)} under the building; it is missing ${describeResources(missing)}.`
}

function describeResources(resources: readonly Resource[]): string {
  return resources.map(resource => RESOURCE_NAMES[resource]).join(', ')
}

/** Why `card` can't be played with the building at `placement`, or null if it can. */
export function playProblem(table: BuiltTable, placement: Placement, card: CardDefinition): string | null {
  const footprint = footprintOf(placement)
  return placementProblem(table, footprint) ?? inputProblem(card, tokensUnder(table, footprint))
}

/** The tokens to take off the table to pay for `card`: one per input, from those under the building. */
export function tokensToPay(card: CardDefinition, tokensBelow: readonly PlacedToken[]): PlacedToken[] {
  const unused = [...tokensBelow]
  return card.inputs.flatMap(input => {
    const index = unused.findIndex(token => token.resource === input)
    return index === -1 ? [] : unused.splice(index, 1)
  })
}

/** The cubes of a building at `footprint` that get an output token: top faces that are open. */
export function outputSquares(table: BuiltTable, footprint: Footprint): Vec3[] {
  const ownCells = new Set(footprint.cells.map(vecKey))
  return footprint.cells.filter(cell => {
    const above = vecKey(addVec(cell, UP))
    return !ownCells.has(above) && !table.occupied.has(above)
  })
}

/** A building put down somewhere that the shape's rules allow, and the tokens it would sit on. */
export interface PlacementOption {
  placement: Placement
  tokensBelow: Resource[]
}

/** How many of the card's inputs the tokens under the building don't supply. */
export function missingInputCount(option: PlacementOption, card: CardDefinition): number {
  return missingResources(card.inputs, option.tokensBelow).length
}

export function canPay(option: PlacementOption, card: CardDefinition): boolean {
  return missingInputCount(option, card) === 0
}

const SEARCH_MARGIN = 3

/** The orientations of a piece that give different shapes, as indexes into the 24 rotations. */
function distinctOrientations(pieceId: string): number[] {
  const seen = new Set<string>()
  const orientations: number[] = []
  for (let orientation = 0; orientation < ROTATION_COUNT; orientation++) {
    const signature = footprintKey({ pieceId, orientation, origin: [0, 0, 0] })
    if (seen.has(signature)) continue
    seen.add(signature)
    orientations.push(orientation)
  }
  return orientations
}

const orientationsByPiece = new Map<string, number[]>(PIECES.map(piece => [piece.id, distinctOrientations(piece.id)]))

/** Every way the given pieces can be put down on the table, whichever card they go with. */
export function* placementOptions(table: BuiltTable, pieceIds: readonly string[]): Generator<PlacementOption> {
  const { min, max } = table.bounds
  const highest = Math.min(MAX_HEIGHT - 1, table.topY + SEARCH_MARGIN + 1)
  for (const pieceId of pieceIds) {
    for (const orientation of orientationsByPiece.get(pieceId) ?? []) {
      for (let x = min[0] - SEARCH_MARGIN; x <= max[0] + SEARCH_MARGIN; x++) {
        for (let z = min[1] - SEARCH_MARGIN; z <= max[1] + SEARCH_MARGIN; z++) {
          for (let y = 0; y <= highest; y++) {
            const placement: Placement = { pieceId, orientation, origin: [x, y, z] }
            const footprint = footprintOf(placement)
            if (placementProblem(table, footprint) !== null) continue
            yield { placement, tokensBelow: tokensUnder(table, footprint).map(token => token.resource) }
          }
        }
      }
    }
  }
}

/** Whether any of `cards` can be played with any of the `pieceIds`. */
export function hasAnyPlay(table: BuiltTable, pieceIds: readonly string[], cards: readonly CardDefinition[]): boolean {
  for (const option of placementOptions(table, pieceIds)) {
    if (cards.some(card => canPay(option, card))) return true
  }
  return false
}
