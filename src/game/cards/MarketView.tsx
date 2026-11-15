import { PIECE_SIZES } from '../catalog'
import { CardButton } from './CardButton'
import { findCard, type CardId } from './catalog'
import type { Market } from './market'

interface MarketViewProps {
  market: Market
  selectedCardId: CardId | null
  /** Only the player to move can pick a card. */
  canPick: boolean
  /** The market cards that fit the picked piece; null when no piece is picked or the mode says nothing. */
  fittingCardIds: ReadonlySet<CardId> | null
  onSelect: (cardId: CardId | null) => void
}

/** The face-up cards, a row for each size of piece, with how many of that size are still face down. */
export function MarketView({ market, selectedCardId, canPick, fittingCardIds, onSelect }: MarketViewProps) {
  return (
    <section aria-label="Market" className="flex flex-wrap gap-2">
      {PIECE_SIZES.map(size => (
        <div key={size} className="flex min-w-0 flex-col gap-1 rounded-xl border border-rule bg-paper p-2">
          <h2 className="text-xs font-semibold text-ink-soft">
            Size {size} · {market.decks[size - 1].length} in the deck
          </h2>
          <div className="flex gap-1">
            {market.rows[size - 1].map(cardId => {
              const card = findCard(cardId)
              if (!card) return null
              return (
                <CardButton
                  key={cardId}
                  card={card}
                  isSelected={cardId === selectedCardId}
                  isSelectable={canPick}
                  fits={fittingCardIds === null ? undefined : fittingCardIds.has(cardId)}
                  onSelect={() => onSelect(cardId === selectedCardId ? null : cardId)}
                />
              )
            })}
            {market.rows[size - 1].length === 0 && <span className="px-1 text-xs text-ink-faint">Sold out</span>}
          </div>
        </div>
      ))}
    </section>
  )
}
