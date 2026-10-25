import { useEffect, useState } from 'react'
import { PIECES } from './catalog'
import { pieceThumbnails } from './scene/thumbnails'
import type { PieceSupply } from './types'

interface PieceTrayProps {
  /** How many of each piece the viewer has left. */
  supply: PieceSupply
  selectedPieceId: string | null
  /** The buildings that fit the picked card; null when no card is picked or the mode says nothing. */
  fittingPieceIds: ReadonlySet<string> | null
  onSelect: (pieceId: string | null) => void
}

/** The buildings in the catalog, with how many of each the viewer has left. */
export function PieceTray({ supply, selectedPieceId, fittingPieceIds, onSelect }: PieceTrayProps) {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => setThumbnails(pieceThumbnails()), [])

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {PIECES.map(piece => {
        const isSelected = piece.id === selectedPieceId
        const remaining = supply[piece.id] ?? 0
        const fits = fittingPieceIds === null ? undefined : fittingPieceIds.has(piece.id)
        const outline = isSelected ? 'border-accent bg-slot font-semibold' : fits ? 'border-ok bg-paper ring-1 ring-ok' : 'border-rule bg-paper hover:bg-slot'
        const thumbnail = thumbnails.get(piece.id)
        return (
          <li key={piece.id} className="shrink-0">
            <button
              type="button"
              disabled={remaining === 0}
              onClick={() => onSelect(isSelected ? null : piece.id)}
              title={piece.name}
              className={`flex w-20 flex-col items-center rounded-xl border p-1 text-[11px] leading-tight transition disabled:cursor-not-allowed disabled:opacity-30 ${outline} ${
                fits === false && !isSelected ? 'opacity-40' : ''
              }`}
            >
              {thumbnail ? <img src={thumbnail} alt="" className="h-16 w-16" /> : <span className="h-16 w-16" />}
              <span className="text-center">{piece.name}</span>
              <span className="tabular-nums text-ink-soft">×{remaining}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
