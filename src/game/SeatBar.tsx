import { ColorSwatch } from 'game-kit/turns'
import type { KowloonState } from './types'

interface SeatBarProps {
  state: KowloonState
  /** In the order to show them: from the viewer's own seat, so the order never gives a seat away. */
  seats: number[]
  nameOf: (seat: number) => string
  colorOf: (seat: number) => string
  onViewFrom: (seat: number) => void
}

/** Who sits where, whose turn it is, and buttons to look at the table from any seat. */
export function SeatBar({ state, seats, nameOf, colorOf, onViewFrom }: SeatBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {seats.map(seat => {
        const isActive = seat === state.playerIndex
        return (
          <button
            key={seat}
            type="button"
            onClick={() => onViewFrom(seat)}
            title={`View the table from ${nameOf(seat)}’s side`}
            className={`flex items-center gap-2 rounded-full border px-3 py-1 text-sm hover:bg-slot ${
              isActive ? 'border-accent bg-paper font-bold' : 'border-rule bg-paper'
            }`}
          >
            <ColorSwatch color={colorOf(seat)} />
            {nameOf(seat)}
            {isActive && <span aria-label="to play">▶</span>}
          </button>
        )
      })}
    </div>
  )
}
