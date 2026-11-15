import { Button } from 'game-kit/turns'
import { useState } from 'react'
import { PIECE_SIZES } from './catalog'
import { countOf, countSizes } from './supply'
import type { SeatState } from './types'

interface SupplyPanelProps {
  /** The viewer's own pieces. */
  seat: SeatState
  onTake: () => void
  onCombine: (returned: number[], size: number) => void
}

const COMBINE_SIZES = PIECE_SIZES.filter(size => size >= 2)

function describeReturned(returned: readonly number[]): string {
  return returned.length === 0 ? 'nothing yet' : returned.map(size => `size ${size}`).join(' + ')
}

/** The viewer's polycubes by size (ready or not yet), and the two ways to ready more: take and combine. */
export function SupplyPanel({ seat, onTake, onCombine }: SupplyPanelProps) {
  const [returned, setReturned] = useState<number[]>([])
  const [target, setTarget] = useState<number | null>(null)
  const chosen = countSizes(returned)

  const combine = () => {
    if (target === null) return
    onCombine(returned, target)
    setReturned([])
    setTarget(null)
  }

  return (
    <section aria-label="Your polycubes" className="flex flex-wrap items-start gap-4 rounded-xl border border-rule bg-paper p-2 text-sm">
      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold text-ink-soft">Your polycubes (ready / not yet)</h2>
        <div className="flex gap-2">
          {PIECE_SIZES.map(size => {
            const readyCount = countOf(seat.ready, size)
            const available = readyCount - countOf(chosen, size)
            return (
              <button
                key={size}
                type="button"
                disabled={available < 1}
                onClick={() => setReturned(current => [...current, size])}
                title={`Size ${size}: ${readyCount} ready, ${countOf(seat.unready, size)} not yet. Click to return one to combine.`}
                className="flex w-14 flex-col items-center rounded-lg border border-rule px-1 py-0.5 enabled:hover:bg-slot disabled:cursor-default"
              >
                <span className="text-[11px] text-ink-soft">size {size}</span>
                <span className="tabular-nums">
                  <b>{readyCount}</b> / {countOf(seat.unready, size)}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold text-ink-soft">Take</h2>
        <Button tone="secondary" onClick={onTake} className="px-3 py-1 text-sm" title="Ready a size 1 polycube">
          Take a size 1
        </Button>
      </div>

      <div className="flex flex-col gap-1">
        <h2 className="text-xs font-semibold text-ink-soft">Combine: returning {describeReturned(returned)}</h2>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-ink-soft">to ready a size</span>
          {COMBINE_SIZES.map(size => (
            <button
              key={size}
              type="button"
              onClick={() => setTarget(target === size ? null : size)}
              aria-pressed={target === size}
              className={`h-7 w-7 rounded-md border text-xs ${target === size ? 'border-accent bg-slot font-bold' : 'border-rule bg-paper hover:bg-slot'}`}
            >
              {size}
            </button>
          ))}
          <Button tone="secondary" onClick={combine} disabled={target === null || returned.length < 2} className="px-3 py-1 text-sm">
            Combine
          </Button>
          <Button tone="secondary" onClick={() => setReturned([])} disabled={returned.length === 0} className="px-3 py-1 text-sm">
            Clear
          </Button>
        </div>
      </div>
    </section>
  )
}
