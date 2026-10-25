import { SegmentedControl } from 'game-kit/turns'
import { VIEW_MODE_HINTS, VIEW_MODE_LABELS, VIEW_MODES, showsCounts, type ViewMode } from './viewModes'

interface PlacementCounts {
  /** Every valid combination of a card in hand, a building, a turn and a place. */
  total: number
  /** The same, for the card or building picked. */
  matching: number
  hasPick: boolean
}

interface ViewModeBarProps {
  mode: ViewMode
  onChange: (mode: ViewMode) => void
  /** Null when it isn't the viewer's turn, so there is nothing to count. */
  counts: PlacementCounts | null
}

/** The view mode picker, and in the computational mode the number of valid placements. */
export function ViewModeBar({ mode, onChange, counts }: ViewModeBarProps) {
  return (
    <div className="ml-auto flex flex-wrap items-center gap-3" title={VIEW_MODE_HINTS[mode]}>
      {showsCounts(mode) && counts && (
        <span className="text-sm tabular-nums" aria-live="polite">
          {counts.total} valid placements
          {counts.hasPick && ` · ${counts.matching} with your pick`}
        </span>
      )}
      <SegmentedControl<ViewMode> options={VIEW_MODES} value={mode} labelOf={option => VIEW_MODE_LABELS[option]} onChange={onChange} />
    </div>
  )
}
