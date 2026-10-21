import { Button } from 'game-kit/turns'
import type { ReactNode } from 'react'
import type { NudgeCommand, TurnCommand } from './screenCommands'

const TURN_BUTTONS: readonly { command: TurnCommand; label: string; title: string }[] = [
  { command: 'spin_left', label: '⟲', title: 'Spin left (A)' },
  { command: 'spin_right', label: '⟳', title: 'Spin right (D)' },
  { command: 'tip_away', label: '⤒', title: 'Tip away (W)' },
  { command: 'tip_toward', label: '⤓', title: 'Tip towards you (S)' },
  { command: 'roll_left', label: '↶', title: 'Roll left (Q)' },
  { command: 'roll_right', label: '↷', title: 'Roll right (E)' },
]

const NUDGE_BUTTONS: readonly { command: NudgeCommand; label: string; title: string }[] = [
  { command: 'left', label: '←', title: 'Move left (←)' },
  { command: 'away', label: '↑', title: 'Move away (↑)' },
  { command: 'toward', label: '↓', title: 'Move towards you (↓)' },
  { command: 'right', label: '→', title: 'Move right (→)' },
  { command: 'up', label: '▲', title: 'Raise (R)' },
  { command: 'down', label: '▼', title: 'Lower (F)' },
]

interface PlacementControlsProps {
  hasPiece: boolean
  canPlace: boolean
  canUndo: boolean
  onTurn: (command: TurnCommand) => void
  onNudge: (command: NudgeCommand) => void
  onPlace: () => void
  onUndo: () => void
  onEndTurn: () => void
}

function IconButton({ title, onClick, disabled, children }: { title: string; onClick: () => void; disabled: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="h-9 w-9 rounded-lg border border-rule bg-paper text-lg leading-none hover:bg-slot disabled:cursor-not-allowed disabled:text-ink-faint disabled:hover:bg-paper"
    >
      {children}
    </button>
  )
}

export function PlacementControls({ hasPiece, canPlace, canUndo, onTurn, onNudge, onPlace, onUndo, onEndTurn }: PlacementControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex gap-1" role="group" aria-label="Turn the piece">
        {TURN_BUTTONS.map(({ command, label, title }) => (
          <IconButton key={command} title={title} onClick={() => onTurn(command)} disabled={!hasPiece}>
            {label}
          </IconButton>
        ))}
      </div>
      <div className="flex gap-1" role="group" aria-label="Move the piece">
        {NUDGE_BUTTONS.map(({ command, label, title }) => (
          <IconButton key={command} title={title} onClick={() => onNudge(command)} disabled={!hasPiece}>
            {label}
          </IconButton>
        ))}
      </div>
      <div className="ml-auto flex gap-2">
        <Button tone="secondary" onClick={onUndo} disabled={!canUndo} className="px-3 py-2 text-sm">
          Take back
        </Button>
        <Button onClick={onPlace} disabled={!canPlace} className="px-4 py-2 text-sm" title="Place (Enter)">
          Place
        </Button>
        <Button tone="secondary" onClick={onEndTurn} className="px-4 py-2 text-sm">
          End turn
        </Button>
      </div>
    </div>
  )
}
