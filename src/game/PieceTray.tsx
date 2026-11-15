import { useEffect, useState } from 'react'
import { PIECES } from './catalog'
import { pieceThumbnails } from './scene/thumbnails'
import { countOf, type SizeCounts } from './supply'

interface PieceTrayProps {
  /** How many pieces of each size the viewer has ready. */
  ready: SizeCounts
  selectedPieceId: string | null
  /** The pieces that fit the picked card; null when no card is picked or the mode says nothing. */
  fittingPieceIds: ReadonlySet<string> | null
  onSelect: (pieceId: string | null) => void
}

/** The shapes the viewer can build, for every size they have a ready piece of. */
export function PieceTray({ ready, selectedPieceId, fittingPieceIds, onSelect }: PieceTrayProps) {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => setThumbnails(pieceThumbnails()), [])
  const readyPieces = PIECES.filter(piece => countOf(ready, piece.size) > 0)

  if (readyPieces.length === 0) return <p className="text-sm text-ink-soft">No piece is ready. Take or combine to ready one.</p>
  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {readyPieces.map(piece => {
        const isSelected = piece.id === selectedPieceId
        const fits = fittingPieceIds === null ? undefined : fittingPieceIds.has(piece.id)
        const outline = isSelected ? 'border-accent bg-slot font-semibold' : fits ? 'border-ok bg-paper ring-1 ring-ok' : 'border-rule bg-paper hover:bg-slot'
        const thumbnail = thumbnails.get(piece.id)
        return (
          <li key={piece.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(isSelected ? null : piece.id)}
              title={`${piece.name}, size ${piece.size}`}
              className={`flex w-20 flex-col items-center rounded-xl border p-1 text-[11px] leading-tight transition ${outline} ${
                fits === false && !isSelected ? 'opacity-40' : ''
              }`}
            >
              {thumbnail ? <img src={thumbnail} alt="" className="h-16 w-16" /> : <span className="h-16 w-16" />}
              <span className="text-center">{piece.name}</span>
              <span className="tabular-nums text-ink-soft">size {piece.size}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
