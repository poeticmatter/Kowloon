import { useEffect, useRef, useState } from 'react'
import {
  IllegalMoveError,
  type BoardProps,
  type PlayerAppearance,
  type PlayerIndex,
  type PlayerProfile,
  type Seating,
  type UserRole,
} from 'game-kit/turns'
import { CardsView } from './cards/CardsView'
import { findCard } from './cards/catalog'
import { PieceTray } from './PieceTray'
import { PlacementControls } from './PlacementControls'
import { PointsHud } from './PointsHud'
import { footprintOf } from './placement'
import { resourcesFor } from './resources'
import { kowloonRules } from './rules'
import { useTableScene } from './scene/useTableScene'
import { worldNudgeFor, worldTurnFor, type NudgeCommand, type TurnCommand } from './screenCommands'
import { SeatBar } from './SeatBar'
import { SEAT_COLORS } from './seatColors'
import type { KowloonMove, KowloonState } from './types'
import { usePlacementDraft, type DraftPreview } from './usePlacementDraft'
import { usePlacementKeys } from './usePlacementKeys'
import { summarizePlacements, usePlacementOptions } from './useValidPlacements'
import { showsHints, showsLiveValidity, useViewMode, type ViewMode } from './viewModes'
import { ViewModeBar } from './ViewModeBar'

interface Viewer {
  role: UserRole
  seating: Seating
  players: PlayerProfile[]
  lookOf: (seat: PlayerIndex) => PlayerIndex
}

/** The look a seat is drawn with: in a solo playtest the seat being played always looks like seat 0. */
function appearanceOf(seat: number, lookOf: Viewer['lookOf']): PlayerAppearance {
  return SEAT_COLORS[lookOf(seat)]
}

/** A solo playtester plays every seat, so only an online viewer is "You". */
function nameOf(seat: number, { role, seating, players, lookOf }: Viewer): string {
  if (seating === 'remote' && role === seat) return 'You'
  return players[seat]?.name ?? appearanceOf(seat, lookOf).name
}

/** Seats are spread evenly round the table, seat 0 on the +z side. */
function seatAzimuth(seat: number, seatCount: number): number {
  return (2 * Math.PI * seat) / seatCount
}

/** The seat the viewer plays (in a solo playtest, the one they were dealt), or null for a spectator. */
function viewersSeat({ role }: Viewer): number | null {
  return typeof role === 'number' ? role : null
}

/** Every seat in turn order from the viewer's own, or from seat 0 for a spectator. */
function seatsFromViewer(seatCount: number, viewer: Viewer): number[] {
  const start = viewersSeat(viewer) ?? 0
  return Array.from({ length: seatCount }, (_, offset) => (start + offset) % seatCount)
}

function handTitle(seat: number, viewer: Viewer): string {
  return viewer.seating === 'remote' ? 'Your hand' : `${nameOf(seat, viewer)}’s hand`
}

interface StatusLine {
  message: string
  isProblem: boolean
}

const REALISTIC_HINT = 'Pick a card and a building, aim it at the table, then Place.'

interface PlayPick {
  hasCard: boolean
  preview: DraftPreview | null
  mode: ViewMode
}

function placementStatus({ hasCard, preview, mode }: PlayPick): StatusLine {
  if (!showsLiveValidity(mode)) return { message: REALISTIC_HINT, isProblem: false }
  if (!hasCard) return { message: 'Pick a card from your hand.', isProblem: false }
  if (!preview) return { message: 'Pick a building, then aim it at the table.', isProblem: false }
  return { message: preview.problem ?? 'Ready to place.', isProblem: preview.problem !== null }
}

/** `ownTurnStatus` is what the active player is told about the card and building they hold. */
function statusLine(state: KowloonState, viewer: Viewer, ownTurnStatus: StatusLine): StatusLine {
  if (viewer.role === 'spectator') return { message: `You’re watching. ${nameOf(state.playerIndex, viewer)} to play.`, isProblem: false }
  if (viewer.role !== state.playerIndex) return { message: `Waiting for ${nameOf(state.playerIndex, viewer)}…`, isProblem: false }
  return ownTurnStatus
}

export function KowloonBoard({ state, role, players, onMove, seating, lookOf }: BoardProps<KowloonState, KowloonMove>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scene = useTableScene(containerRef, state.tableSize)
  const [viewMode, setViewMode] = useViewMode()
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [attemptProblem, setAttemptProblem] = useState<string | null>(null)
  const viewer: Viewer = { role, seating, players, lookOf }
  const handSeat = viewersSeat(viewer)
  const resources = resourcesFor(state.resourceCount)
  const hand = handSeat === null ? [] : state.cards.hands[handSeat].flatMap(cardId => findCard(cardId, resources) ?? [])
  const selectedCard = hand.find(card => card.id === selectedCardId) ?? null
  const draft = usePlacementDraft(state, selectedCard)
  const isViewersTurn = role === state.playerIndex
  const preview = isViewersTurn ? draft.preview : null
  const activeColor = appearanceOf(state.playerIndex, lookOf).color
  const colorOf = (seat: number) => appearanceOf(seat, lookOf).color

  // Only the modes that show hints or counts pay for the search over every placement.
  const isSearching = isViewersTurn && (showsHints(viewMode) || viewMode === 'computational')
  const options = usePlacementOptions(state, handSeat, isSearching)
  const summary = summarizePlacements(options, hand, { card: selectedCard, pieceId: draft.pieceId })
  const hintCells = isSearching && showsHints(viewMode) ? summary.originCells : []

  useEffect(() => {
    const buildings = state.pieces.map(piece => ({ footprint: footprintOf(piece), color: appearanceOf(piece.owner, lookOf).color }))
    scene?.setBuildings(buildings)
  }, [scene, state.pieces, lookOf])

  useEffect(() => {
    scene?.setTokens(state.tokens)
  }, [scene, state.tokens])

  useEffect(() => {
    // The ghost's colour tells whether the placement is valid, which the realistic mode keeps to itself.
    const isValid = !showsLiveValidity(viewMode) || preview?.problem === null
    scene?.setGhost(preview ? { footprint: preview.footprint, color: activeColor, isValid } : null)
  }, [scene, preview, activeColor, viewMode])

  useEffect(() => {
    scene?.setHints(hintCells)
  }, [scene, hintCells])

  // Each player sits on their own side; a solo playtester sits at the seat they were dealt.
  const viewingSeat = handSeat ?? 0
  useEffect(() => {
    scene?.viewFromAzimuth(seatAzimuth(viewingSeat, state.seatCount))
  }, [scene, viewingSeat, state.seatCount])

  // A new player starts with nothing picked. Keyed on the turn only: the selectors are fresh functions each render.
  useEffect(() => {
    draft.selectPiece(null)
    setSelectedCardId(null)
    setAttemptProblem(null)
  }, [state.playerIndex])

  const selectPiece = (pieceId: string | null) => {
    draft.selectPiece(pieceId)
    setAttemptProblem(null)
  }
  const selectCard = (cardId: string | null) => {
    setSelectedCardId(cardId)
    setAttemptProblem(null)
  }

  /** Plays the move if the rules accept it; otherwise says why, which is all the realistic mode ever reveals. */
  const attempt = (move: KowloonMove) => {
    try {
      kowloonRules.applyMove(state, move)
    } catch (error) {
      if (!(error instanceof IllegalMoveError)) throw error
      setAttemptProblem(error.message)
      return
    }
    setAttemptProblem(null)
    onMove(move)
  }
  const placeDraft = () => {
    if (!preview) return
    if (!selectedCard) {
      setAttemptProblem('Pick a card from your hand first.')
      return
    }
    attempt({ kind: 'play', cardId: selectedCard.id, ...preview.placement })
  }
  const canPlace = preview !== null && selectedCard !== null && (!showsLiveValidity(viewMode) || preview.problem === null)
  const turn = (command: TurnCommand) => {
    if (!scene) return
    const { axis, direction } = worldTurnFor(command, scene.getAzimuth())
    draft.turn(axis, direction)
    setAttemptProblem(null)
  }
  const nudge = (command: NudgeCommand) => {
    if (!scene) return
    draft.nudge(worldNudgeFor(command, scene.getAzimuth()))
    setAttemptProblem(null)
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
      if (pointerType !== 'mouse' || !clicked || !selectedCard) return
      if (showsLiveValidity(viewMode) && clicked.problem !== null) return
      attempt({ kind: 'play', cardId: selectedCard.id, ...clicked.placement })
    },
  })

  usePlacementKeys({ isEnabled: isViewersTurn && draft.pieceId !== null, onTurn: turn, onNudge: nudge, onPlace: placeDraft })

  const ownTurnStatus: StatusLine = attemptProblem
    ? { message: attemptProblem, isProblem: true }
    : placementStatus({ hasCard: selectedCard !== null, preview, mode: viewMode })
  const status = statusLine(state, viewer, ownTurnStatus)
  const seats = seatsFromViewer(state.seatCount, viewer)
  const lastDiscardId = state.cards.discard.at(-1)
  const lastDiscard = lastDiscardId === undefined ? null : (findCard(lastDiscardId, resources) ?? null)
  const counts = isSearching
    ? { total: summary.total, matching: summary.matching, hasPick: selectedCard !== null || draft.pieceId !== null }
    : null
  return (
    <div className="flex h-screen flex-col gap-2 p-3">
      <header className="flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-bold">Kowloon</h1>
        <SeatBar
          state={state}
          seats={seats}
          nameOf={seat => nameOf(seat, viewer)}
          colorOf={colorOf}
          onViewFrom={seat => scene?.viewFromAzimuth(seatAzimuth(seat, state.seatCount))}
        />
        <ViewModeBar mode={viewMode} onChange={setViewMode} counts={counts} />
      </header>

      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border border-rule bg-slot">
        <div ref={containerRef} className="absolute inset-0" />
        <PointsHud
          state={state}
          seats={seats}
          nameOf={seat => nameOf(seat, viewer)}
          colorOf={colorOf}
          canAdjust={isViewersTurn}
          onAdjust={(seat, delta) => onMove({ kind: 'adjust_points', seat, delta })}
        />
        <p className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm font-semibold ${status.isProblem ? 'text-alert' : 'text-ink'}`}>
          {status.message}
        </p>
      </div>

      <CardsView
        table={state.cards}
        handSeat={handSeat}
        handTitle={handSeat === null ? '' : handTitle(handSeat, viewer)}
        hand={hand}
        lastDiscard={lastDiscard}
        selectedCardId={selectedCard?.id ?? null}
        canPick={isViewersTurn}
        fittingCardIds={isSearching && showsHints(viewMode) ? summary.cardIds : null}
        onSelect={selectCard}
      />

      {isViewersTurn && handSeat !== null && (
        <section className="flex flex-col gap-2">
          <PlacementControls
            hasPiece={draft.pieceId !== null}
            canPlace={canPlace}
            onTurn={turn}
            onNudge={nudge}
            onPlace={placeDraft}
            onPass={() => attempt({ kind: 'pass' })}
          />
          <PieceTray
            supply={state.supplies[handSeat]}
            selectedPieceId={draft.pieceId}
            fittingPieceIds={isSearching && showsHints(viewMode) ? summary.pieceIds : null}
            onSelect={selectPiece}
          />
        </section>
      )}
    </div>
  )
}
