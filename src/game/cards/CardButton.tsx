import type { CardDefinition } from './catalog'
import { abilityText } from './describe'

interface CardButtonProps {
  card: CardDefinition
  isSelected: boolean
  isSelectable: boolean
  /** True when the card fits what else is picked, false when it doesn't; undefined when nothing is said. */
  fits?: boolean
  onSelect: () => void
}

/** A card's face: its name, the size of piece it is built with, and what it does. */
export function CardFace({ card }: { card: CardDefinition }) {
  return (
    <>
      <span className="flex items-start justify-between gap-1">
        <span className="line-clamp-2 text-left text-[11px] font-semibold leading-tight">{card.name}</span>
        <span className="shrink-0 rounded-full bg-accent px-1.5 text-[11px] font-bold leading-5 text-on-accent" title={`Built with a size ${card.size} piece`}>
          {card.size}
        </span>
      </span>
      <span className="flex flex-1 items-center text-left text-[11px] leading-tight text-ink-soft">{abilityText(card.ability)}</span>
    </>
  )
}

export function CardButton({ card, isSelected, isSelectable, fits, onSelect }: CardButtonProps) {
  const outline = isSelected ? 'border-accent ring-2 ring-accent' : fits ? 'border-ok ring-1 ring-ok' : 'border-rule'
  const dimmed = fits === false && !isSelected ? 'opacity-40' : ''
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isSelectable}
      aria-pressed={isSelected}
      className={`flex h-24 w-32 shrink-0 flex-col rounded-lg border bg-paper p-1.5 text-ink shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-default ${outline} ${dimmed}`}
    >
      <CardFace card={card} />
    </button>
  )
}
