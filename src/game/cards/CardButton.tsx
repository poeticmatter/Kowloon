import { ArrowDown } from 'lucide-react'
import type { Resource } from '../resources'
import { ResourceIcon } from '../ResourceIcon'
import type { CardDefinition } from './catalog'

const ICON_SIZE = 14

interface CardButtonProps {
  /** Null shows the card's back. */
  card: CardDefinition | null
  isSelected: boolean
  isSelectable: boolean
  /** True when the card fits what else is picked, false when it doesn't; undefined when nothing is said. */
  fits?: boolean
  onSelect: () => void
}

function ResourceRow({ resources, label }: { resources: readonly Resource[]; label: string }) {
  return (
    <span className="flex h-4 items-center justify-center gap-0.5" aria-label={label}>
      {resources.map((resource, index) => (
        <ResourceIcon key={index} resource={resource} size={ICON_SIZE} />
      ))}
    </span>
  )
}

function CardFace({ card }: { card: CardDefinition }) {
  return (
    <>
      <span className="line-clamp-2 min-h-[2lh] text-[11px] font-semibold leading-tight">{card.name}</span>
      <span className="flex flex-1 flex-col items-center justify-center gap-0.5">
        <ResourceRow resources={card.inputs} label="Takes" />
        <ArrowDown size={12} className="text-ink-faint" aria-hidden />
        <ResourceRow resources={[card.output]} label="Makes" />
      </span>
    </>
  )
}

export function CardButton({ card, isSelected, isSelectable, fits, onSelect }: CardButtonProps) {
  const face = card === null ? 'items-center justify-center bg-accent text-on-accent' : 'bg-paper text-ink'
  const outline = isSelected ? 'border-accent ring-2 ring-accent' : fits ? 'border-ok ring-1 ring-ok' : 'border-rule'
  const dimmed = fits === false && !isSelected ? 'opacity-40' : ''
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isSelectable}
      aria-pressed={isSelected}
      className={`flex h-32 w-24 shrink-0 flex-col rounded-lg border p-1.5 text-center shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-default ${face} ${outline} ${dimmed}`}
    >
      {card === null ? <span className="text-xs font-semibold">Kowloon</span> : <CardFace card={card} />}
    </button>
  )
}
