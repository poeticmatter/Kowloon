import { useState } from 'react'
import { CardButton } from './CardButton'
import { locateCard, type CardTable, type CardZone } from './cardTable'
import { CardZoneBox, EmptyZoneHint } from './CardZoneBox'
import { CARDS, type CardId } from './catalog'

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
 * The deck, the market row, the played cards and this screen's hand. Moving a card takes two
 * clicks, pick it then "Move here" on another zone, which works the same with a mouse or a finger.
 */
export function CardTableView({ table, handSeat, handTitle, canMove, onMoveCard, onShuffle }: CardTableViewProps) {
  const [pickedCardId, setPickedCardId] = useState<CardId | null>(null)
  // A pick lapses once the card leaves this player's reach, e.g. after the move goes through.
  const pickedFrom = canMove && pickedCardId !== null && handSeat !== null ? locateCard(table, pickedCardId, handSeat) : null
  const selectedCardId = pickedFrom === null ? null : pickedCardId

  const toggle = (cardId: CardId) => setPickedCardId(selectedCardId === cardId ? null : cardId)
  const zoneProps = (zone: CardZone) => ({
    isTarget: pickedFrom !== null && pickedFrom !== zone,
    onMoveHere: () => {
      if (selectedCardId === null) return
      onMoveCard(selectedCardId, zone)
      setPickedCardId(null)
    },
  })
  const faceUp = (cardId: CardId) => (
    <CardButton
      key={cardId}
      name={CARDS[cardId].name}
      isSelected={cardId === selectedCardId}
      isSelectable={canMove}
      onSelect={() => toggle(cardId)}
    />
  )

  const topOfDeck = table.deck.at(-1)
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
            <CardButton name={null} isSelected={topOfDeck === selectedCardId} isSelectable={canMove} onSelect={() => toggle(topOfDeck)} />
          )}
        </CardZoneBox>
        <CardZoneBox title="Market" {...zoneProps('market')} className="flex-1 basis-64">
          {table.market.length === 0 ? <EmptyZoneHint>Empty</EmptyZoneHint> : table.market.map(faceUp)}
        </CardZoneBox>
        <CardZoneBox title="Played · newest first" {...zoneProps('played')} className="flex-1 basis-64">
          {table.played.length === 0 ? <EmptyZoneHint>Nothing played yet</EmptyZoneHint> : [...table.played].reverse().map(faceUp)}
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
