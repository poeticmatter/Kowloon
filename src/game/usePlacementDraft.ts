import { useMemo, useState } from 'react'
import { addVec, isSameVec, turnOrientation, UP, type Axis, type Vec3 } from './geometry'
import { footprintOf, originForAim, placementProblem, type AimTarget, type Footprint } from './placement'
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
  /** Why it can't go there, or null if it can. */
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

function isSameAim(a: AimTarget, b: AimTarget): boolean {
  return isSameVec(a.cell, b.cell) && isSameVec(a.normal, b.normal)
}

function previewFor(state: KowloonState, pieceId: string, orientation: number, target: AimTarget, nudge: Vec3): DraftPreview {
  const origin = addVec(originForAim({ pieceId, orientation }, target), nudge)
  const placement: Placement = { pieceId, orientation, origin }
  const footprint = footprintOf(placement)
  const problem = placementProblem(state.pieces.map(footprintOf), footprint, state.tableSize)
  return { placement, footprint, problem }
}

/** The piece the active player is lining up, before it is committed as a move. */
export function usePlacementDraft(state: KowloonState): PlacementDraft {
  const [draft, setDraft] = useState<Draft>(() => ({
    pieceId: null,
    orientation: UNTURNED,
    target: centerOfTable(state.tableSize),
    nudge: NO_NUDGE,
  }))

  const preview = useMemo(
    () => (draft.pieceId ? previewFor(state, draft.pieceId, draft.orientation, draft.target, draft.nudge) : null),
    [state, draft],
  )

  return {
    pieceId: draft.pieceId,
    preview,
    selectPiece: pieceId => setDraft(current => ({ ...current, pieceId, orientation: UNTURNED, nudge: NO_NUDGE })),
    turn: (axis, direction) => setDraft(current => ({ ...current, orientation: turnOrientation(current.orientation, axis, direction) })),
    // Hovering fires on every mouse move; keep the same draft while the aimed cell is unchanged.
    aim: target => setDraft(current => (isSameAim(current.target, target) ? current : { ...current, target, nudge: NO_NUDGE })),
    nudge: offset => setDraft(current => ({ ...current, nudge: addVec(current.nudge, offset) })),
    previewAt: target => (draft.pieceId ? previewFor(state, draft.pieceId, draft.orientation, target, NO_NUDGE) : null),
  }
}
