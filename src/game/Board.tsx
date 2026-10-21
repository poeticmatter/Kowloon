import { useEffect, useRef } from 'react'
import type { BoardProps, PlayerProfile, Seating, UserRole } from 'game-kit/turns'
import { PieceTray } from './PieceTray'
import { PlacementControls } from './PlacementControls'
import { footprintOf } from './placement'
import { useTableScene } from './scene/useTableScene'
import { worldNudgeFor, worldTurnFor, type NudgeCommand, type TurnCommand } from './screenCommands'
import { SeatBar } from './SeatBar'
import { seatAppearance } from './seatColors'
import type { KowloonMove, KowloonState, Placement } from './types'
import { usePlacementDraft, type DraftPreview } from './usePlacementDraft'
import { usePlacementKeys } from './usePlacementKeys'

interface Viewer {
  role: UserRole
  seating: Seating
  players: PlayerProfile[]
}

/** Hot-seat players share one screen, so only an online viewer is "You". */
function nameOf(seat: number, { role, seating, players }: Viewer): string {
  if (seating === 'remote' && role === seat) return 'You'
  return players[seat]?.name ?? `Player ${seat + 1}`
}

/** Seats are spread evenly round the table, seat 0 on the +z side. */
function seatAzimuth(seat: number, seatCount: number): number {
  return (2 * Math.PI * seat) / seatCount
}

function statusMessage(state: KowloonState, viewer: Viewer, preview: DraftPreview | null): string {
  if (viewer.role === 'spectator') return `You’re watching. ${nameOf(state.playerIndex, viewer)} to play.`
  if (viewer.role !== state.playerIndex) return `Waiting for ${nameOf(state.playerIndex, viewer)}…`
  if (!preview) return 'Pick a building below, then aim it at the table.'
  return preview.problem ?? 'Ready to place.'
}

export function KowloonBoard({ state, role, players, onMove, seating }: BoardProps<KowloonState, KowloonMove>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scene = useTableScene(containerRef, state.tableSize)
  const draft = usePlacementDraft(state)
  const viewer: Viewer = { role, seating, players }
  const isViewersTurn = role === state.playerIndex
  const preview = isViewersTurn ? draft.preview : null
  const activeColor = seatAppearance(state.playerIndex, state.colorShift).color

  useEffect(() => {
    const buildings = state.pieces.map(piece => ({ footprint: footprintOf(piece), color: seatAppearance(piece.owner, state.colorShift).color }))
    scene?.setBuildings(buildings)
  }, [scene, state.pieces, state.colorShift])

  useEffect(() => {
    scene?.setGhost(preview ? { footprint: preview.footprint, color: activeColor, isValid: preview.problem === null } : null)
  }, [scene, preview, activeColor])

  // Hot seat: the table turns to face whoever is playing. Online: each player sits on their own side.
  const viewingSeat = seating === 'hot_seat' ? state.playerIndex : typeof role === 'number' ? role : 0
  useEffect(() => {
    scene?.viewFromAzimuth(seatAzimuth(viewingSeat, state.seatCount))
  }, [scene, viewingSeat, state.seatCount])

  // A new player starts with empty hands. Keyed on the turn only: selectPiece is a fresh function each render.
  useEffect(() => {
    draft.selectPiece(null)
  }, [state.playerIndex])

  const place = (placement: Placement) => onMove({ kind: 'place', ...placement })
  const placeDraft = () => {
    if (preview && preview.problem === null) place(preview.placement)
  }
  const turn = (command: TurnCommand) => {
    if (!scene) return
    const { axis, direction } = worldTurnFor(command, scene.getAzimuth())
    draft.turn(axis, direction)
  }
  const nudge = (command: NudgeCommand) => {
    if (scene) draft.nudge(worldNudgeFor(command, scene.getAzimuth()))
  }

  scene?.setHandlers({
    onHover: ({ target }) => {
      if (isViewersTurn && target) draft.aim(target)
    },
    // A mouse click places straight away; a tap only aims, so a stray finger can't build.
    onClick: ({ target, pointerType }) => {
      if (!isViewersTurn || !target) return
      draft.aim(target)
      const clicked = draft.previewAt(target)
      if (pointerType === 'mouse' && clicked && clicked.problem === null) place(clicked.placement)
    },
  })

  usePlacementKeys({ isEnabled: isViewersTurn && draft.pieceId !== null, onTurn: turn, onNudge: nudge, onPlace: placeDraft })

  const isProblem = preview !== null && preview.problem !== null
  return (
    <div className="flex h-screen flex-col gap-2 p-3">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">Kowloon</h1>
        <SeatBar
          state={state}
          nameOf={seat => nameOf(seat, viewer)}
          canRotateColors={isViewersTurn}
          onViewFrom={seat => scene?.viewFromAzimuth(seatAzimuth(seat, state.seatCount))}
          onRotateColors={() => onMove({ kind: 'rotate_colors' })}
        />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-rule bg-slot">
        <div ref={containerRef} className="absolute inset-0" />
        <p className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm font-semibold ${isProblem ? 'text-alert' : 'text-ink'}`}>
          {statusMessage(state, viewer, preview)}
        </p>
      </div>

      {isViewersTurn && (
        <section className="flex flex-col gap-2">
          <PlacementControls
            hasPiece={draft.pieceId !== null}
            canPlace={preview !== null && preview.problem === null}
            canUndo={state.placedThisTurn.length > 0}
            onTurn={turn}
            onNudge={nudge}
            onPlace={placeDraft}
            onUndo={() => onMove({ kind: 'undo_place' })}
            onEndTurn={() => onMove({ kind: 'end_turn' })}
          />
          <PieceTray selectedPieceId={draft.pieceId} onSelect={draft.selectPiece} />
        </section>
      )}
    </div>
  )
}
