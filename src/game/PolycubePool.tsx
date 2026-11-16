import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { PIECES, type PieceDefinition } from './catalog'
import { gainedPiece } from './effects'
import { pieceThumbnails } from './scene/thumbnails'
import { shapeCount } from './supply'
import type { SeatState } from './types'

interface PolycubePoolProps {
  /** The viewer's own pieces. */
  seat: SeatState
  /** The ready shape picked to build with. */
  selectedPieceId: string | null
  /** The ready shapes that fit the picked card; null when no card is picked or the mode says nothing. */
  fittingPieceIds: ReadonlySet<string> | null
  onSelectPiece: (pieceId: string | null) => void
  onTake: () => void
  onCombine: (returned: string[], pieceId: string) => void
}

type DragSource = 'ready' | 'pool'

interface DragPayload {
  from: DragSource
  pieceId: string
}

const DRAG_TYPE = 'application/x-kowloon-piece'

function readPayload(event: DragEvent): DragPayload | null {
  const raw = event.dataTransfer.getData(DRAG_TYPE)
  if (!raw) return null
  const parsed: unknown = JSON.parse(raw)
  if (typeof parsed !== 'object' || parsed === null) return null
  const { from, pieceId } = parsed as Record<string, unknown>
  return (from === 'ready' || from === 'pool') && typeof pieceId === 'string' ? { from, pieceId } : null
}

interface TileProps {
  piece: PieceDefinition
  thumbnail: string | undefined
  count: number
  badge?: string
  drag: DragPayload
  isSelected?: boolean
  fits?: boolean
  title: string
  onClick: () => void
}

/** One shape as a picture with how many there are. It can be clicked or dragged. */
function Tile({ piece, thumbnail, count, badge, drag, isSelected = false, fits, title, onClick }: TileProps) {
  const outline = isSelected ? 'border-accent bg-slot' : fits ? 'border-ok ring-1 ring-ok' : 'border-rule hover:bg-slot'
  return (
    <button
      type="button"
      draggable
      onDragStart={event => event.dataTransfer.setData(DRAG_TYPE, JSON.stringify(drag))}
      onClick={onClick}
      title={title}
      className={`relative flex w-16 shrink-0 flex-col items-center rounded-lg border bg-paper p-0.5 text-[10px] leading-tight transition ${outline} ${
        fits === false && !isSelected ? 'opacity-40' : ''
      }`}
    >
      {thumbnail ? <img src={thumbnail} alt={piece.name} draggable={false} className="h-12 w-12" /> : <span className="h-12 w-12" />}
      <span className="tabular-nums text-ink-soft">
        {piece.name} ×{count}
      </span>
      {badge && <span className="absolute right-0.5 top-0.5 rounded bg-accent px-1 text-[9px] font-bold text-on-accent">{badge}</span>}
    </button>
  )
}

interface ZoneProps {
  title: string
  hint: string
  onDropPayload?: (payload: DragPayload) => void
  children: ReactNode
}

function Zone({ title, hint, onDropPayload, children }: ZoneProps) {
  const [isOver, setIsOver] = useState(false)
  const isTarget = onDropPayload !== undefined
  return (
    <section
      aria-label={title}
      onDragOver={isTarget ? event => (event.preventDefault(), setIsOver(true)) : undefined}
      onDragLeave={isTarget ? () => setIsOver(false) : undefined}
      onDrop={
        isTarget
          ? event => {
              event.preventDefault()
              setIsOver(false)
              const payload = readPayload(event)
              if (payload) onDropPayload(payload)
            }
          : undefined
      }
      className={`flex min-w-0 flex-col gap-1 rounded-xl border p-2 ${isOver ? 'border-accent bg-slot' : 'border-rule bg-paper'}`}
    >
      <h2 className="text-xs font-semibold text-ink-soft" title={hint}>
        {title}
      </h2>
      <div className="flex min-h-[4.5rem] flex-wrap content-start gap-1">{children}</div>
    </section>
  )
}

/**
 * The viewer's polycubes as pictures. Ready ones are clicked to build with, or dragged to the
 * Combine zone to be returned. Dropping a not-yet shape on the Ready zone readies it: by taking it
 * (the cube) or by combining the shapes set aside into it.
 */
export function PolycubePool({ seat, selectedPieceId, fittingPieceIds, onSelectPiece, onTake, onCombine }: PolycubePoolProps) {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(new Map())
  const [setAside, setSetAside] = useState<string[]>([])
  useEffect(() => setThumbnails(pieceThumbnails()), [])

  const setAsideCount = (pieceId: string) => setAside.filter(candidate => candidate === pieceId).length
  const takePieceId = gainedPiece(seat, 1)

  const ready = (piece: PieceDefinition) => shapeCount(seat.ready, piece.id) - setAsideCount(piece.id)
  const readyPieces = PIECES.filter(piece => ready(piece) > 0)
  const notYetPieces = PIECES.filter(piece => shapeCount(seat.unready, piece.id) > 0)

  const returnToReady = (pieceId: string) => {
    if (setAside.length === 0 && pieceId === takePieceId) {
      onTake()
      return
    }
    onCombine(setAside, pieceId)
    setSetAside([])
  }
  const setPieceAside = (pieceId: string) => setSetAside(current => [...current, pieceId])
  const putBack = (pieceId: string) => setSetAside(current => current.filter((_, index) => index !== current.lastIndexOf(pieceId)))

  return (
    <div className="grid gap-2 md:grid-cols-[2fr_1fr_3fr]">
      <Zone
        title="Ready: click one to build, or drag it to Combine"
        hint="Pieces you can build with now. Drop a not-yet shape here to ready it."
        onDropPayload={({ from, pieceId }) => (from === 'pool' ? returnToReady(pieceId) : setAsideCount(pieceId) > 0 && putBack(pieceId))}
      >
        {readyPieces.length === 0 && <span className="px-1 text-xs text-ink-faint">None ready. Take or combine.</span>}
        {readyPieces.map(piece => (
          <Tile
            key={piece.id}
            piece={piece}
            thumbnail={thumbnails.get(piece.id)}
            count={ready(piece)}
            drag={{ from: 'ready', pieceId: piece.id }}
            isSelected={piece.id === selectedPieceId}
            fits={fittingPieceIds === null ? undefined : fittingPieceIds.has(piece.id)}
            title={`${piece.name}, size ${piece.size}. Click to build with it.`}
            onClick={() => onSelectPiece(piece.id === selectedPieceId ? null : piece.id)}
          />
        ))}
      </Zone>

      <Zone
        title="Combine: drop ready pieces here"
        hint="Click a piece here to put it back. Then drop or click a not-yet shape to ready it."
        onDropPayload={({ from, pieceId }) => from === 'ready' && setPieceAside(pieceId)}
      >
        {setAside.length === 0 && <span className="px-1 text-xs text-ink-faint">Nothing set aside</span>}
        {setAside.map((pieceId, index) => {
          const piece = PIECES.find(candidate => candidate.id === pieceId)
          return piece && <Tile key={index} piece={piece} thumbnail={thumbnails.get(pieceId)} count={1} drag={{ from: 'ready', pieceId }} title={`${piece.name}. Click to put it back.`} onClick={() => putBack(pieceId)} />
        })}
      </Zone>

      <Zone
        title="Not yet: drop one on Ready to take or combine into it"
        hint="Drag a shape to the Ready zone (or click it). The cube takes; any other shape combines the pieces set aside."
      >
        {notYetPieces.map(piece => (
          <Tile
            key={piece.id}
            piece={piece}
            thumbnail={thumbnails.get(piece.id)}
            count={shapeCount(seat.unready, piece.id)}
            badge={setAside.length === 0 && piece.id === takePieceId ? 'take' : undefined}
            drag={{ from: 'pool', pieceId: piece.id }}
            title={`${piece.name}, size ${piece.size}. ${setAside.length === 0 && piece.id === takePieceId ? 'Click to take it.' : 'Click to combine the pieces set aside into it.'}`}
            onClick={() => returnToReady(piece.id)}
          />
        ))}
      </Zone>
    </div>
  )
}
