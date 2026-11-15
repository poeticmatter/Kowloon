import { useMemo } from 'react'
import { findPiece, PIECE_SIZES } from './catalog'
import type { CardDefinition } from './cards/catalog'
import { vecKey, type Vec3 } from './geometry'
import { builtTableOf } from './placement'
import { allowedPieceSizes, pieceIdsOfSizes, placementOptions } from './play'
import { countOf } from './supply'
import type { KowloonState, Placement } from './types'

/** What the player picked, as far as it narrows the search. */
export interface PickedPlay {
  card: CardDefinition | null
  pieceId: string | null
  /** How many shrink cards the player has, which widen the sizes a card can be built with. */
  shrinkCount: number
}

export interface PlacementSummary {
  /** Every (piece, turn, place) combination that is valid for the seat's ready pieces. */
  total: number
  /** The same, narrowed to the pick. Equal to `total` with nothing picked. */
  matching: number
  /** Every valid placement of the picked piece with the picked card; empty unless both are picked. */
  pickedPlacements: Placement[]
  /** Where the picked card or piece can pivot, one cell per distinct origin; empty with nothing picked. */
  originCells: Vec3[]
  /** The ready pieces that fit the picked card and have a valid placement; null if no card is picked. */
  pieceIds: ReadonlySet<string> | null
}

/** The seat's valid placements of every piece it has ready, found once per state and shared by every pick. */
export function usePlacementOptions(state: KowloonState, seat: number | null, isEnabled: boolean): readonly Placement[] {
  return useMemo(() => {
    if (!isEnabled || seat === null) return []
    const readySizes = PIECE_SIZES.filter(size => countOf(state.seats[seat].ready, size) > 0)
    return [...placementOptions(builtTableOf(state), pieceIdsOfSizes(readySizes))]
  }, [state, seat, isEnabled])
}

export function summarizePlacements(options: readonly Placement[], pick: PickedPlay): PlacementSummary {
  const allowedSizes = pick.card ? allowedPieceSizes(pick.card, pick.shrinkCount) : null
  const isSizeAllowed = (pieceId: string) => allowedSizes === null || allowedSizes.includes(findPiece(pieceId)?.size ?? 0)
  const isPicked = ({ pieceId }: Placement) => isSizeAllowed(pieceId) && (pick.pieceId === null || pick.pieceId === pieceId)

  const matching = options.filter(isPicked)
  const hasPick = pick.card !== null || pick.pieceId !== null
  const origins = new Map(matching.map(({ origin }) => [vecKey(origin), origin]))
  return {
    total: options.length,
    matching: matching.length,
    pickedPlacements: pick.card && pick.pieceId ? matching : [],
    originCells: hasPick ? [...origins.values()] : [],
    pieceIds: pick.card ? new Set(options.filter(({ pieceId }) => isSizeAllowed(pieceId)).map(({ pieceId }) => pieceId)) : null,
  }
}
