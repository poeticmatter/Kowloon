import { ColorSwatch } from 'game-kit/turns'
import { seatAppearance } from './seatColors'
import type { KowloonState } from './types'

interface SeatBarProps {
  state: KowloonState
  nameOf: (seat: number) => string
  canRotateColors: boolean
  onViewFrom: (seat: number) => void
  onRotateColors: () => void
}

/** Who sits where, whose turn it is, and buttons to look at the table from any seat. */
export function SeatBar({ state, nameOf, canRotateColors, onViewFrom, onRotateColors }: SeatBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {Array.from({ length: state.seatCount }, (_, seat) => {
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
            <ColorSwatch color={seatAppearance(seat, state.colorShift).color} />
            {nameOf(seat)}
            {isActive && <span aria-label="to play">▶</span>}
          </button>
        )
      })}
      <button
        type="button"
        onClick={onRotateColors}
        disabled={!canRotateColors}
        title="Shift every player to the next colour"
        className="rounded-full border border-rule bg-paper px-3 py-1 text-sm hover:bg-slot disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-paper"
      >
        Rotate colours
      </button>
    </div>
  )
}
