import { ColorSwatch } from 'game-kit/turns'
import { seatAppearance } from './seatColors'
import type { KowloonState } from './types'

interface PointsHudProps {
  state: KowloonState
  nameOf: (seat: number) => string
  /** GameKit only applies moves from the player to move, so only they can change the score. */
  canAdjust: boolean
  onAdjust: (seat: number, delta: number) => void
}

const STEP_BUTTON_CLASS =
  'h-6 w-6 rounded-md border border-rule bg-paper leading-none hover:bg-slot disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-paper'

/** Every player's points, laid over the table. */
export function PointsHud({ state, nameOf, canAdjust, onAdjust }: PointsHudProps) {
  return (
    <section aria-label="Points" className="absolute left-2 top-2 flex flex-col gap-1 rounded-xl border border-rule bg-paper/90 p-2 text-sm shadow-sm">
      <h2 className="text-xs font-semibold text-ink-soft">Points</h2>
      {state.points.map((points, seat) => {
        const name = nameOf(seat)
        return (
          <div key={seat} className="flex items-center gap-2">
            <ColorSwatch color={seatAppearance(seat, state.colorShift).color} />
            <span className={`mr-auto max-w-32 truncate ${seat === state.playerIndex ? 'font-bold' : ''}`}>{name}</span>
            <button type="button" className={STEP_BUTTON_CLASS} disabled={!canAdjust} onClick={() => onAdjust(seat, -1)} aria-label={`Take a point from ${name}`}>
              −
            </button>
            <span className="w-8 text-center font-semibold tabular-nums">{points}</span>
            <button type="button" className={STEP_BUTTON_CLASS} disabled={!canAdjust} onClick={() => onAdjust(seat, 1)} aria-label={`Give ${name} a point`}>
              +
            </button>
          </div>
        )
      })}
    </section>
  )
}
