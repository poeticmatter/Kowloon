import { ColorSwatch } from 'game-kit/turns'
import { cardsOf } from './cards/catalog'
import { cardsScore, scoreOf } from './scoring'
import type { KowloonState } from './types'

interface ScoreHudProps {
  state: KowloonState
  /** In the order to show them: from the viewer's own seat, so the order never gives a seat away. */
  seats: number[]
  nameOf: (seat: number) => string
  colorOf: (seat: number) => string
}

/** Every player's score, laid over the table, and their tableau of cards. */
export function ScoreHud({ state, seats, nameOf, colorOf }: ScoreHudProps) {
  return (
    <section aria-label="Scores" className="absolute left-2 top-2 flex max-w-72 flex-col gap-2 rounded-xl border border-rule bg-paper/90 p-2 text-sm shadow-sm">
      <h2 className="text-xs font-semibold text-ink-soft">
        {state.isOver ? 'Final scores' : state.isEndTriggered ? 'Final round' : 'Scores'}
      </h2>
      {seats.map(seat => {
        const own = state.seats[seat]
        return (
          <div key={seat} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              <ColorSwatch color={colorOf(seat)} />
              <span className={`mr-auto max-w-32 truncate ${seat === state.playerIndex && !state.isOver ? 'font-bold' : ''}`}>{nameOf(seat)}</span>
              <span className="font-semibold tabular-nums" title={`${cardsScore(own)} from cards, ${own.points} from effects`}>
                {scoreOf(own)}
              </span>
            </div>
            <p className="pl-6 text-[11px] leading-tight text-ink-soft">
              {own.tableau.length === 0
                ? 'No cards yet'
                : cardsOf(own.tableau)
                    .map(card => `${card.name} (${card.size})`)
                    .join(', ')}
            </p>
          </div>
        )
      })}
    </section>
  )
}
