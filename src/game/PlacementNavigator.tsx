interface PlacementNavigatorProps {
  /** How many valid placements the picked card and building have. */
  count: number
  /** Which of them the ghost shows, or null if it is somewhere else. */
  currentIndex: number | null
  /** How many of them turn the building about the pivot where the ghost is. */
  rotationsHere: number
  onStep: (step: 1 | -1) => void
  onRotateHere: () => void
}

const BUTTON_CLASS =
  'rounded-lg border border-rule bg-paper px-3 py-1 text-sm hover:bg-slot disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-paper'

/** Steps the ghost through every valid placement of the picked card and building. */
export function PlacementNavigator({ count, currentIndex, rotationsHere, onStep, onRotateHere }: PlacementNavigatorProps) {
  if (count === 0) return <p className="text-sm text-ink-soft">This card and building have no valid placement.</p>
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Valid placements">
      <button type="button" className={BUTTON_CLASS} onClick={() => onStep(-1)} aria-label="Previous valid placement">
        ◀
      </button>
      <span className="min-w-28 text-center tabular-nums">
        {currentIndex === null ? '–' : currentIndex + 1} of {count} valid
      </span>
      <button type="button" className={BUTTON_CLASS} onClick={() => onStep(1)} aria-label="Next valid placement">
        ▶
      </button>
      <button
        type="button"
        className={BUTTON_CLASS}
        onClick={onRotateHere}
        disabled={rotationsHere < 2}
        title="Turn through the valid ways to place it at this spot"
      >
        ⟳ Rotate here ({rotationsHere})
      </button>
    </div>
  )
}
