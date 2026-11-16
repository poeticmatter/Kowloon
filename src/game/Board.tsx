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
import { isNeutral } from './catalog'
import { countPassive, findCard, type CardId } from './cards/catalog'
import { MarketView } from './cards/MarketView'
import { isSameVec } from './geometry'
import { PolycubePool } from './PolycubePool'
import { PlacementControls } from './PlacementControls'
import { footprintKey, footprintOf } from './placement'
import { PlacementNavigator } from './PlacementNavigator'
import { sizeProblem } from './play'
import { kowloonRules } from './rules'
import { ScoreHud } from './ScoreHud'
import { scoreOf, winnersOf } from './scoring'
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

/** Neutral pieces belong to no seat, so they are not drawn in any seat's colour. */
const NEUTRAL_COLOR = '#8a8f98'

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

interface StatusLine {
  message: string
  isProblem: boolean
}

const REALISTIC_HINT = 'Pick a market card and a piece of its size, aim it at the table, then Place. Or take or combine.'

interface PlayPick {
  hasCard: boolean
  preview: DraftPreview | null
  mode: ViewMode
}

function placementStatus({ hasCard, preview, mode }: PlayPick): StatusLine {
  if (!showsLiveValidity(mode)) return { message: REALISTIC_HINT, isProblem: false }
  if (!hasCard) return { message: 'Pick a card from the market, or take or combine.', isProblem: false }
  if (!preview) return { message: 'Pick a ready piece, then aim it at the table.', isProblem: false }
  return { message: preview.problem ?? 'Ready to place.', isProblem: preview.problem !== null }
}

function gameOverMessage(state: KowloonState, viewer: Viewer): string {
  const winners = winnersOf(state.seats)
  const names = winners.map(seat => nameOf(seat, viewer)).join(' and ')
  return `Game over: ${names} ${winners.length === 1 ? 'wins' : 'tie'} with ${scoreOf(state.seats[winners[0]])}.`
}

/** `ownTurnStatus` is what the active player is told about the card and piece they hold. */
function statusLine(state: KowloonState, viewer: Viewer, ownTurnStatus: StatusLine): StatusLine {
  if (state.isOver) return { message: gameOverMessage(state, viewer), isProblem: false }
  if (viewer.role === 'spectator') return { message: `You’re watching. ${nameOf(state.playerIndex, viewer)} to play.`, isProblem: false }
  if (viewer.role !== state.playerIndex) return { message: `Waiting for ${nameOf(state.playerIndex, viewer)}…`, isProblem: false }
  return ownTurnStatus
}

/** The market cards the picked piece can be built with. */
function cardsFittingPiece(state: KowloonState, pieceId: string, shrinkCount: number): Set<CardId> {
  const fitting = state.market.rows.flat().filter(cardId => {
    const card = findCard(cardId)
    return card !== undefined && sizeProblem(card, pieceId, shrinkCount) === null
  })
  return new Set(fitting)
}

export function KowloonBoard({ state, role, players, onMove, seating, lookOf }: BoardProps<KowloonState, KowloonMove>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scene = useTableScene(containerRef, state.tableSize)
  const [viewMode, setViewMode] = useViewMode()
  const [selectedCardId, setSelectedCardId] = useState<CardId | null>(null)
  const [attemptProblem, setAttemptProblem] = useState<string | null>(null)
  const viewer: Viewer = { role, seating, players, lookOf }
  const handSeat = viewersSeat(viewer)
  const ownSeat = handSeat === null ? null : state.seats[handSeat]
  const shrinkCount = ownSeat ? countPassive(ownSeat.tableau, 'shrink') : 0
  const selectedCard = (selectedCardId && findCard(selectedCardId)) || null
  const draft = usePlacementDraft(state, { card: selectedCard, shrinkCount })
  const isViewersTurn = role === state.playerIndex && !state.isOver
  const preview = isViewersTurn ? draft.preview : null
  const activeColor = appearanceOf(state.playerIndex, lookOf).color
  const colorOf = (seat: number) => appearanceOf(seat, lookOf).color

  // Only the modes that show hints or counts pay for the search over every placement.
  const isSearching = isViewersTurn && (showsHints(viewMode) || viewMode === 'computational')
  const options = usePlacementOptions(state, handSeat, isSearching)
  const summary = summarizePlacements(options, { card: selectedCard, pieceId: draft.pieceId, shrinkCount })
  const hintCells = isSearching && showsHints(viewMode) ? summary.originCells : []
  const fittingCardIds = isSearching && showsHints(viewMode) && draft.pieceId ? cardsFittingPiece(state, draft.pieceId, shrinkCount) : null

  useEffect(() => {
    const buildings = state.pieces.map(piece => ({
      footprint: footprintOf(piece),
      color: isNeutral(piece.pieceId) ? NEUTRAL_COLOR : appearanceOf(piece.owner, lookOf).color,
    }))
    scene?.setBuildings(buildings)
  }, [scene, state.pieces, lookOf])

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
  const selectCard = (cardId: CardId | null) => {
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
      setAttemptProblem('Pick a card from the market first.')
      return
    }
    attempt({ kind: 'build', cardId: selectedCard.id, ...preview.placement })
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
      attempt({ kind: 'build', cardId: selectedCard.id, ...clicked.placement })
    },
  })

  // The valid placements of the picked card and piece, to step through and to rotate at one spot.
  const validPlacements = isSearching && showsHints(viewMode) ? summary.pickedPlacements : []
  const previewKey = preview ? footprintKey(preview.placement) : null
  const currentIndex = validPlacements.findIndex(placement => footprintKey(placement) === previewKey)
  const stepPlacement = (step: 1 | -1) => {
    const first = step === 1 ? 0 : validPlacements.length - 1
    const next = currentIndex === -1 ? first : (currentIndex + step + validPlacements.length) % validPlacements.length
    draft.setPlacement(validPlacements[next])
    setAttemptProblem(null)
  }
  const placementsHere = preview ? validPlacements.filter(placement => isSameVec(placement.origin, preview.placement.origin)) : []
  const rotateHere = () => {
    const hereIndex = placementsHere.findIndex(placement => footprintKey(placement) === previewKey)
    draft.setPlacement(placementsHere[(hereIndex + 1) % placementsHere.length])
    setAttemptProblem(null)
  }

  usePlacementKeys({ isEnabled: isViewersTurn && draft.pieceId !== null, onTurn: turn, onNudge: nudge, onPlace: placeDraft })

  const ownTurnStatus: StatusLine = attemptProblem
    ? { message: attemptProblem, isProblem: true }
    : placementStatus({ hasCard: selectedCard !== null, preview, mode: viewMode })
  const status = statusLine(state, viewer, ownTurnStatus)
  const seats = seatsFromViewer(state.seatCount, viewer)
  const counts = isSearching ? { total: summary.total, matching: summary.matching, hasPick: selectedCard !== null || draft.pieceId !== null } : null
  return (
    <div className="flex h-screen flex-col gap-2 overflow-y-auto p-3">
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

      <div className="relative min-h-64 flex-1 overflow-hidden rounded-2xl border border-rule bg-slot">
        <div ref={containerRef} className="absolute inset-0" />
        <ScoreHud state={state} seats={seats} nameOf={seat => nameOf(seat, viewer)} colorOf={colorOf} />
        <p className={`pointer-events-none absolute inset-x-0 bottom-2 text-center text-sm font-semibold ${status.isProblem ? 'text-alert' : 'text-ink'}`}>
          {status.message}
        </p>
      </div>

      <MarketView market={state.market} selectedCardId={selectedCard?.id ?? null} canPick={isViewersTurn} fittingCardIds={fittingCardIds} onSelect={selectCard} />

      {isViewersTurn && ownSeat && (
        <section className="flex flex-col gap-2">
          <PlacementControls
            hasPiece={draft.pieceId !== null}
            canPlace={canPlace}
            onTurn={turn}
            onNudge={nudge}
            onPlace={placeDraft}
            onPass={() => attempt({ kind: 'pass' })}
          />
          {isSearching && showsHints(viewMode) && selectedCard && draft.pieceId && (
            <PlacementNavigator
              count={validPlacements.length}
              currentIndex={currentIndex === -1 ? null : currentIndex}
              rotationsHere={placementsHere.length}
              onStep={stepPlacement}
              onRotateHere={rotateHere}
            />
          )}
          <PolycubePool
            seat={ownSeat}
            selectedPieceId={draft.pieceId}
            fittingPieceIds={isSearching && showsHints(viewMode) ? summary.pieceIds : null}
            onSelectPiece={selectPiece}
            onTake={() => attempt({ kind: 'take' })}
            onCombine={(returned, pieceId) => attempt({ kind: 'combine', returned, pieceId })}
          />
        </section>
      )}
    </div>
  )
}
