import { useMemo } from 'react'
import { PIECES } from './catalog'
import type { CardDefinition } from './cards/catalog'
import { vecKey, type Vec3 } from './geometry'
import { builtTableOf } from './placement'
import { canPay, placementOptions, type PlacementOption } from './play'
import type { KowloonState } from './types'

/** What the player picked, as far as it narrows the search. */
export interface PickedPlay {
  card: CardDefinition | null
  pieceId: string | null
}

export interface PlacementSummary {
  /** Every (card, building, turn, place) combination that is valid for the seat's hand and supply. */
  total: number
  /** The same, narrowed to the pick. Equal to `total` with nothing picked. */
  matching: number
  /** Where the picked card or building can pivot, one cell per distinct origin; empty with nothing picked. */
  originCells: Vec3[]
  /** The buildings with a valid placement for the picked card; null if no card is picked. */
  pieceIds: ReadonlySet<string> | null
  /** The hand cards with a valid placement for the picked building; null if no building is picked. */
  cardIds: ReadonlySet<string> | null
}

/** The seat's geometrically valid placements, found once per state and shared by every pick. */
export function usePlacementOptions(state: KowloonState, seat: number | null, isEnabled: boolean): readonly PlacementOption[] {
  return useMemo(() => {
    if (!isEnabled || seat === null) return []
    const supply = state.supplies[seat]
    const pieceIds = PIECES.map(piece => piece.id).filter(pieceId => supply[pieceId] > 0)
    return [...placementOptions(builtTableOf(state), pieceIds)]
  }, [state, seat, isEnabled])
}

export function summarizePlacements(options: readonly PlacementOption[], hand: readonly CardDefinition[], pick: PickedPlay): PlacementSummary {
  const origins = new Map<string, Vec3>()
  const pieceIds = new Set<string>()
  const cardIds = new Set<string>()
  let total = 0
  let matching = 0

  for (const option of options) {
    const { pieceId, origin } = option.placement
    for (const card of hand) {
      if (!canPay(option, card)) continue
      total++
      const isCardPicked = pick.card === null || pick.card.id === card.id
      const isPiecePicked = pick.pieceId === null || pick.pieceId === pieceId
      if (pick.card && pick.card.id === card.id) pieceIds.add(pieceId)
      if (pick.pieceId === pieceId) cardIds.add(card.id)
      if (isCardPicked && isPiecePicked) {
        matching++
        if (pick.card || pick.pieceId) origins.set(vecKey(origin), origin)
      }
    }
  }
  return {
    total,
    matching,
    originCells: [...origins.values()],
    pieceIds: pick.card ? pieceIds : null,
    cardIds: pick.pieceId ? cardIds : null,
  }
}
