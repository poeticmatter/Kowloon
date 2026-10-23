import { ArrowDown } from 'lucide-react'
import type { Resource } from '../resources'
import { ResourceIcon } from '../ResourceIcon'
import { findCard, type CardId } from './catalog'

const ICON_SIZE = 14

interface CardButtonProps {
  /** Null shows the card's back. */
  cardId: CardId | null
  isSelected: boolean
  isSelectable: boolean
  onSelect: () => void
}

function ResourceRow({ resources, label }: { resources: readonly Resource[]; label: string }) {
  return (
    <span className="flex h-4 items-center justify-center gap-0.5" aria-label={label}>
      {resources.length === 0 ? <span className="text-ink-faint">—</span> : resources.map((resource, index) => <ResourceIcon key={index} resource={resource} size={ICON_SIZE} />)}
    </span>
  )
}

function CardFace({ cardId }: { cardId: CardId }) {
  const card = findCard(cardId)
  if (!card) throw new Error(`Unknown card "${cardId}"`)
  return (
    <>
      <span className="line-clamp-2 min-h-[2lh] text-[11px] font-semibold leading-tight">{card.name}</span>
      <span className="flex flex-1 flex-col items-center justify-center gap-0.5">
        <ResourceRow resources={card.inputs} label="Takes" />
        <ArrowDown size={12} className="text-ink-faint" aria-hidden />
        <ResourceRow resources={card.outputs} label="Makes" />
      </span>
      <span className="self-end rounded bg-slot px-1 text-[11px] font-bold tabular-nums" aria-label={`${card.points} points`}>
        {card.points}
      </span>
    </>
  )
}

export function CardButton({ cardId, isSelected, isSelectable, onSelect }: CardButtonProps) {
  const face = cardId === null ? 'items-center justify-center bg-accent text-on-accent' : 'bg-paper text-ink'
  const outline = isSelected ? 'border-accent ring-2 ring-accent' : 'border-rule'
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isSelectable}
      aria-pressed={isSelected}
      className={`flex h-32 w-24 shrink-0 flex-col rounded-lg border p-1.5 text-center shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-default ${face} ${outline}`}
    >
      {cardId === null ? <span className="text-xs font-semibold">Kowloon</span> : <CardFace cardId={cardId} />}
    </button>
  )
}
