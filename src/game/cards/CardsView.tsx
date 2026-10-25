import { CardButton } from './CardButton'
import type { CardTable } from './cardTable'
import type { CardDefinition } from './catalog'

interface CardsViewProps {
  table: CardTable
  /** The seat whose hand this screen shows, or null for a spectator. */
  handSeat: number | null
  handTitle: string
  /** The hand as card definitions, in hand order. */
  hand: readonly CardDefinition[]
  /** The card on top of the discard pile, if any. */
  lastDiscard: CardDefinition | null
  selectedCardId: string | null
  /** Only the player to move can pick a card. */
  canPick: boolean
  /** The hand cards that fit the picked building; null when no building is picked or the mode says nothing. */
  fittingCardIds: ReadonlySet<string> | null
  onSelect: (cardId: string | null) => void
}

function Zone({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section aria-label={title} className={`flex min-w-0 flex-col gap-1 rounded-xl border border-rule bg-paper p-2 ${className}`}>
      <h2 className="h-6 truncate text-xs font-semibold leading-6 text-ink-soft">{title}</h2>
      <div className="flex min-h-32 items-center gap-1 overflow-x-auto pb-1">{children}</div>
    </section>
  )
}

/** This screen's hand, the deck and the discard pile (only its last card shows). */
export function CardsView({ table, handSeat, handTitle, hand, lastDiscard, selectedCardId, canPick, fittingCardIds, onSelect }: CardsViewProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {handSeat !== null && (
        <Zone title={handTitle} className="flex-1 basis-96">
          {hand.length === 0 ? (
            <span className="px-1 text-xs text-ink-faint">No cards in hand</span>
          ) : (
            hand.map(card => (
              <CardButton
                key={card.id}
                card={card}
                isSelected={card.id === selectedCardId}
                isSelectable={canPick}
                fits={fittingCardIds === null ? undefined : fittingCardIds.has(card.id)}
                onSelect={() => onSelect(card.id === selectedCardId ? null : card.id)}
              />
            ))
          )}
        </Zone>
      )}
      <Zone title={`Deck · ${table.deck.length}`} className="shrink-0">
        {table.deck.length === 0 ? <span className="px-1 text-xs text-ink-faint">Empty</span> : <CardButton card={null} isSelected={false} isSelectable={false} onSelect={() => {}} />}
      </Zone>
      <Zone title={`Discard · ${table.discard.length}`} className="shrink-0">
        {lastDiscard === null ? (
          <span className="px-1 text-xs text-ink-faint">Nothing discarded</span>
        ) : (
          <CardButton card={lastDiscard} isSelected={false} isSelectable={false} onSelect={() => {}} />
        )}
      </Zone>
    </div>
  )
}
