interface CardButtonProps {
  /** Null shows the card's back. */
  name: string | null
  isSelected: boolean
  isSelectable: boolean
  onSelect: () => void
}

export function CardButton({ name, isSelected, isSelectable, onSelect }: CardButtonProps) {
  const face = name === null ? 'bg-accent text-on-accent' : 'bg-paper text-ink'
  const outline = isSelected ? 'border-accent ring-2 ring-accent' : 'border-rule'
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={!isSelectable}
      aria-pressed={isSelected}
      className={`flex h-24 w-16 shrink-0 items-center justify-center rounded-lg border p-1 text-center text-xs font-semibold leading-tight shadow-sm transition enabled:hover:-translate-y-0.5 disabled:cursor-default ${face} ${outline}`}
    >
      {name ?? 'Kowloon'}
    </button>
  )
}
