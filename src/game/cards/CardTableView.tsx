import { useState } from 'react'
import { CardButton } from './CardButton'
import { locateCard, type CardTable, type CardZone } from './cardTable'
import { CardZoneBox, EmptyZoneHint } from './CardZoneBox'
import type { CardId } from './catalog'

interface CardTableViewProps {
  table: CardTable
  /** The seat whose hand this screen shows, or null for a spectator. */
  handSeat: number | null
  handTitle: string
  /** Only the player to move can move cards; everyone else just watches. */
  canMove: boolean
  onMoveCard: (cardId: CardId, to: CardZone) => void
  onShuffle: () => void
}

/**
 * The deck, the market row, the discard pile and this screen's hand. Move a card by dragging it onto another zone, or
 * with two clicks (pick it, then "Move here"), which also works on a touch screen.
 */
export function CardTableView({ table, handSeat, handTitle, canMove, onMoveCard, onShuffle }: CardTableViewProps) {
  // A card is picked by clicking it or by starting to drag it.
  const [pickedCardId, setPickedCardId] = useState<CardId | null>(null)
  // A pick lapses once the card leaves where it was picked, e.g. after the move goes through.
  const pickedFrom = canMove && pickedCardId !== null && handSeat !== null ? locateCard(table, pickedCardId, handSeat) : null
  const selectedCardId = pickedFrom === null ? null : pickedCardId

  const toggle = (cardId: CardId) => setPickedCardId(selectedCardId === cardId ? null : cardId)
  const zoneProps = (zone: CardZone) => {
    const isTarget = pickedFrom !== null && pickedFrom !== zone
    const moveHere = () => {
      if (selectedCardId === null) return
      onMoveCard(selectedCardId, zone)
      setPickedCardId(null)
    }
    return { isTarget, onMoveHere: moveHere, canDrop: isTarget }
  }
  const dragProps = (cardId: CardId) => ({
    onDragStart: () => setPickedCardId(cardId),
    onDragEnd: () => setPickedCardId(null),
  })
  const faceUp = (cardId: CardId) => (
    <CardButton
      key={cardId}
      cardId={cardId}
      isSelected={cardId === selectedCardId}
      isSelectable={canMove}
      onSelect={() => toggle(cardId)}
      {...dragProps(cardId)}
    />
  )

  const topOfDeck = table.deck.at(-1)
  const lastDiscard = table.discard.at(-1)
  const hand = handSeat === null ? null : table.hands[handSeat]
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <CardZoneBox
          title={`Deck · ${table.deck.length}`}
          {...zoneProps('deck')}
          actions={
            canMove && (
              <button type="button" onClick={onShuffle} disabled={table.deck.length < 2} className="rounded-md border border-rule px-2 py-0.5 hover:bg-slot disabled:text-ink-faint">
                Shuffle
              </button>
            )
          }
          className="shrink-0"
        >
          {topOfDeck === undefined ? (
            <EmptyZoneHint>Empty</EmptyZoneHint>
          ) : (
            <CardButton
              cardId={null}
              isSelected={topOfDeck === selectedCardId}
              isSelectable={canMove}
              onSelect={() => toggle(topOfDeck)}
              {...dragProps(topOfDeck)}
            />
          )}
        </CardZoneBox>
        <CardZoneBox title="Market" {...zoneProps('market')} className="flex-1 basis-64">
          {table.market.length === 0 ? <EmptyZoneHint>Empty</EmptyZoneHint> : table.market.map(faceUp)}
        </CardZoneBox>
        <CardZoneBox title={`Discard · ${table.discard.length}`} {...zoneProps('discard')} className="shrink-0">
          {lastDiscard === undefined ? <EmptyZoneHint>Nothing discarded</EmptyZoneHint> : faceUp(lastDiscard)}
        </CardZoneBox>
      </div>
      {hand && (
        <CardZoneBox title={handTitle} {...zoneProps('hand')}>
          {hand.length === 0 ? <EmptyZoneHint>No cards in hand</EmptyZoneHint> : hand.map(faceUp)}
        </CardZoneBox>
      )}
    </div>
  )
}
