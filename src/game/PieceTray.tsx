import { useEffect, useState } from 'react'
import { PIECES } from './catalog'
import { pieceThumbnails } from './scene/thumbnails'

interface PieceTrayProps {
  selectedPieceId: string | null
  onSelect: (pieceId: string | null) => void
}

/** Every building in the catalog; the sandbox has an endless supply of each. */
export function PieceTray({ selectedPieceId, onSelect }: PieceTrayProps) {
  const [thumbnails, setThumbnails] = useState<ReadonlyMap<string, string>>(new Map())
  useEffect(() => setThumbnails(pieceThumbnails()), [])

  return (
    <ul className="flex gap-2 overflow-x-auto pb-1">
      {PIECES.map(piece => {
        const isSelected = piece.id === selectedPieceId
        const thumbnail = thumbnails.get(piece.id)
        return (
          <li key={piece.id} className="shrink-0">
            <button
              type="button"
              onClick={() => onSelect(isSelected ? null : piece.id)}
              title={piece.name}
              className={`flex w-20 flex-col items-center rounded-xl border p-1 text-[11px] leading-tight transition ${
                isSelected ? 'border-accent bg-slot font-semibold' : 'border-rule bg-paper hover:bg-slot'
              }`}
            >
              {thumbnail ? <img src={thumbnail} alt="" className="h-16 w-16" /> : <span className="h-16 w-16" />}
              <span className="text-center">{piece.name}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
