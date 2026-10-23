import { useEffect, useRef } from 'react'
import type { BoardProps, PlayerProfile, Seating, UserRole } from 'game-kit/turns'
import { CardTableView } from './cards/CardTableView'
import { PieceTray } from './PieceTray'
import { PlacementControls } from './PlacementControls'
import { PointsHud } from './PointsHud'
import { footprintOf } from './placement'
import { useTableScene } from './scene/useTableScene'
import { worldNudgeFor, worldTurnFor, type NudgeCommand, type TurnCommand } from './screenCommands'
import { SeatBar } from './SeatBar'
import { TokenTray } from './TokenTray'
import { seatAppearance } from './seatColors'
import type { KowloonMove, KowloonState, Placement } from './types'
import { usePlacementDraft, type DraftPreview } from './usePlacementDraft'
import { usePlacementKeys } from './usePlacementKeys'
import { useTokenTool, type TokenTool } from './useTokenTool'

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

/** Hot-seat players share one screen, which shows whoever is playing; online, each player sees their own seat. */
function viewersSeat({ role, seating }: Viewer, activeSeat: number): number | null {
  if (seating === 'hot_seat') return activeSeat
  return typeof role === 'number' ? role : null
}

function handTitle(seat: number, viewer: Viewer): string {
  return viewer.seating === 'remote' ? 'Your hand' : `${nameOf(seat, viewer)}’s hand`
}

interface StatusLine {
  message: string
  isProblem: boolean
}

function placementStatus(preview: DraftPreview | null): StatusLine {
  if (!preview) return { message: 'Pick a building or a token below, then aim it at the table.', isProblem: false }
  return { message: preview.problem ?? 'Ready to place.', isProblem: preview.problem !== null }
}

/** `ownTurnStatus` is what the active player is told about the building or token in hand. */
function statusLine(state: KowloonState, viewer: Viewer, ownTurnStatus: StatusLine): StatusLine {
  if (viewer.role === 'spectator') return { message: `You’re watching. ${nameOf(state.playerIndex, viewer)} to play.`, isProblem: false }
  if (viewer.role !== state.playerIndex) return { message: `Waiting for ${nameOf(state.playerIndex, viewer)}…`, isProblem: false }
  return ownTurnStatus
}

export function KowloonBoard({ state, role, players, onMove, seating }: BoardProps<KowloonState, KowloonMove>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scene = useTableScene(containerRef, state.tableSize)
  const draft = usePlacementDraft(state)
  const tokenTool = useTokenTool(state)
  const viewer: Viewer = { role, seating, players }
  const isViewersTurn = role === state.playerIndex
  const preview = isViewersTurn ? draft.preview : null
  const activeColor = seatAppearance(state.playerIndex, state.colorShift).color

  useEffect(() => {
    const buildings = state.pieces.map(piece => ({ footprint: footprintOf(piece), color: seatAppearance(piece.owner, state.colorShift).color }))
    scene?.setBuildings(buildings)
  }, [scene, state.pieces, state.colorShift])

  useEffect(() => {
    scene?.setTokens(state.tokens)
  }, [scene, state.tokens])

  useEffect(() => {
    scene?.setGhost(preview ? { footprint: preview.footprint, color: activeColor, isValid: preview.problem === null } : null)
  }, [scene, preview, activeColor])

  // Hot seat: the table turns to face whoever is playing. Online: each player sits on their own side.
  const ownSeat = viewersSeat(viewer, state.playerIndex)
  const viewingSeat = ownSeat ?? 0
  useEffect(() => {
    scene?.viewFromAzimuth(seatAzimuth(viewingSeat, state.seatCount))
  }, [scene, viewingSeat, state.seatCount])

  // A new player starts with empty hands. Keyed on the turn only: the selectors are fresh functions each render.
  useEffect(() => {
    draft.selectPiece(null)
    tokenTool.select(null)
  }, [state.playerIndex])

  // The player holds a building or a token, never both.
  const selectPiece = (pieceId: string | null) => {
    draft.selectPiece(pieceId)
    if (pieceId) tokenTool.select(null)
  }
  const selectTokenTool = (tool: TokenTool | null) => {
    tokenTool.select(tool)
    if (tool) draft.selectPiece(null)
  }

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
      if (!isViewersTurn) return
      if (tokenTool.tool) tokenTool.aim(target)
      else if (target) draft.aim(target)
    },
    // A mouse click places straight away; a tap only aims, so a stray finger can't build.
    // Tokens go down on a tap too: they're quick to pick back up.
    onClick: ({ target, pointerType }) => {
      if (!isViewersTurn || !target) return
      if (tokenTool.tool) {
        tokenTool.aim(target)
        const move = tokenTool.moveAt(target)
        if (move) onMove(move)
        return
      }
      draft.aim(target)
      const clicked = draft.previewAt(target)
      if (pointerType === 'mouse' && clicked && clicked.problem === null) place(clicked.placement)
    },
  })

  usePlacementKeys({ isEnabled: isViewersTurn && draft.pieceId !== null, onTurn: turn, onNudge: nudge, onPlace: placeDraft })

  const status = statusLine(state, viewer, tokenTool.status ?? placementStatus(preview))
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
        <PointsHud
          state={state}
          nameOf={seat => nameOf(seat, viewer)}
          canAdjust={isViewersTurn}
          onAdjust={(seat, delta) => onMove({ kind: 'adjust_points', seat, delta })}
        />
        <p className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm font-semibold ${status.isProblem ? 'text-alert' : 'text-ink'}`}>
          {status.message}
        </p>
      </div>

      {/* Keyed on the turn so a card picked by one hot-seat player isn't still picked for the next. */}
      <CardTableView
        key={state.playerIndex}
        table={state.cards}
        handSeat={ownSeat}
        handTitle={ownSeat === null ? '' : handTitle(ownSeat, viewer)}
        canMove={isViewersTurn}
        onMoveCard={(cardId, to) => onMove({ kind: 'move_card', cardId, to })}
        onShuffle={() => onMove({ kind: 'shuffle_deck' })}
      />

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
          <div className="flex gap-3">
            <TokenTray selectedTool={tokenTool.tool} onSelect={selectTokenTool} />
            <div className="min-w-0 flex-1">
              <PieceTray selectedPieceId={draft.pieceId} onSelect={selectPiece} />
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
