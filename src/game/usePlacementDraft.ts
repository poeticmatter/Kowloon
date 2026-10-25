import { useMemo, useState } from 'react'
import { addVec, turnOrientation, UP, type Axis, type Vec3 } from './geometry'
import type { CardDefinition } from './cards/catalog'
import { builtTableOf, footprintOf, isSameAim, originForAim, placementProblem, type AimTarget, type BuiltTable, type Footprint } from './placement'
import { playProblem } from './play'
import type { KowloonState, Placement } from './types'

const UNTURNED = 0
const NO_NUDGE: Vec3 = [0, 0, 0]

interface Draft {
  pieceId: string | null
  orientation: number
  /** Where the player last aimed; the piece is re-seated against it after every turn. */
  target: AimTarget
  /** Manual adjustment on top of the aim, from the nudge controls. */
  nudge: Vec3
}

export interface DraftPreview {
  placement: Placement
  footprint: Footprint
  /** Why it can't go there (with the picked card, if any), or null if it can. */
  problem: string | null
}

export interface PlacementDraft {
  pieceId: string | null
  /** Null until a piece is selected. */
  preview: DraftPreview | null
  selectPiece: (pieceId: string | null) => void
  turn: (axis: Axis, direction: 1 | -1) => void
  aim: (target: AimTarget) => void
  nudge: (offset: Vec3) => void
  /** What putting the selected piece at `target` would look like, without moving the draft. */
  previewAt: (target: AimTarget) => DraftPreview | null
}

function centerOfTable(tableSize: number): AimTarget {
  const middle = Math.floor(tableSize / 2)
  return { cell: [middle, 0, middle], normal: UP }
}

function previewFor(table: BuiltTable, card: CardDefinition | null, pieceId: string, orientation: number, target: AimTarget, nudge: Vec3): DraftPreview {
  const origin = addVec(originForAim({ pieceId, orientation }, target), nudge)
  const placement: Placement = { pieceId, orientation, origin }
  const footprint = footprintOf(placement)
  const problem = card ? playProblem(table, placement, card) : placementProblem(table, footprint)
  return { placement, footprint, problem }
}

/** The piece the active player is lining up with their picked card, before it is committed as a move. */
export function usePlacementDraft(state: KowloonState, card: CardDefinition | null): PlacementDraft {
  const [draft, setDraft] = useState<Draft>(() => ({
    pieceId: null,
    orientation: UNTURNED,
    target: centerOfTable(state.tableSize),
    nudge: NO_NUDGE,
  }))

  const table = useMemo(() => builtTableOf(state), [state])
  const preview = useMemo(
    () => (draft.pieceId ? previewFor(table, card, draft.pieceId, draft.orientation, draft.target, draft.nudge) : null),
    [table, card, draft],
  )

  return {
    pieceId: draft.pieceId,
    preview,
    selectPiece: pieceId => setDraft(current => ({ ...current, pieceId, orientation: UNTURNED, nudge: NO_NUDGE })),
    turn: (axis, direction) => setDraft(current => ({ ...current, orientation: turnOrientation(current.orientation, axis, direction) })),
    // Hovering fires on every mouse move; keep the same draft while the aimed cell is unchanged.
    aim: target => setDraft(current => (isSameAim(current.target, target) ? current : { ...current, target, nudge: NO_NUDGE })),
    nudge: offset => setDraft(current => ({ ...current, nudge: addVec(current.nudge, offset) })),
    previewAt: target => (draft.pieceId ? previewFor(table, card, draft.pieceId, draft.orientation, target, NO_NUDGE) : null),
  }
}
