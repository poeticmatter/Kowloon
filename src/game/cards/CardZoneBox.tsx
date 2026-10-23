import type { ReactNode } from 'react'

interface CardZoneBoxProps {
  title: string
  /** True while a card from another zone is selected and could be moved here. */
  isTarget: boolean
  onMoveHere: () => void
  /** Extra header controls, such as the deck's shuffle button. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

export function CardZoneBox({ title, isTarget, onMoveHere, actions, children, className = '' }: CardZoneBoxProps) {
  return (
    <section
      aria-label={title}
      className={`flex min-w-0 flex-col gap-1 rounded-xl border bg-paper p-2 ${isTarget ? 'border-accent' : 'border-rule'} ${className}`}
    >
      <header className="flex h-6 items-center gap-2 text-xs font-semibold text-ink-soft">
        <span className="mr-auto truncate">{title}</span>
        {actions}
        {isTarget && (
          <button type="button" onClick={onMoveHere} className="rounded-md bg-accent px-2 py-0.5 text-on-accent">
            Move here
          </button>
        )}
      </header>
      <div className="flex min-h-32 items-center gap-1 overflow-x-auto pb-1">{children}</div>
    </section>
  )
}

export function EmptyZoneHint({ children }: { children: ReactNode }) {
  return <span className="px-1 text-xs text-ink-faint">{children}</span>
}
