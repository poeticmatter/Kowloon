import { useEffect } from 'react'
import type { NudgeCommand, TurnCommand } from './screenCommands'

const TURN_KEYS: Readonly<Record<string, TurnCommand>> = {
  a: 'spin_left',
  d: 'spin_right',
  w: 'tip_away',
  s: 'tip_toward',
  q: 'roll_left',
  e: 'roll_right',
}

const NUDGE_KEYS: Readonly<Record<string, NudgeCommand>> = {
  ArrowLeft: 'left',
  ArrowRight: 'right',
  ArrowUp: 'away',
  ArrowDown: 'toward',
  r: 'up',
  f: 'down',
}

interface PlacementKeyHandlers {
  isEnabled: boolean
  onTurn: (command: TurnCommand) => void
  onNudge: (command: NudgeCommand) => void
  onPlace: () => void
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement
}

/** Keyboard shortcuts for lining up and placing a piece. */
export function usePlacementKeys({ isEnabled, onTurn, onNudge, onPlace }: PlacementKeyHandlers): void {
  useEffect(() => {
    if (!isEnabled) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey || isTypingTarget(event.target)) return
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (key in TURN_KEYS) onTurn(TURN_KEYS[key])
      else if (key in NUDGE_KEYS) onNudge(NUDGE_KEYS[key])
      // A focused button already answers Enter with a click.
      else if (key === 'Enter' && !(event.target instanceof HTMLButtonElement)) onPlace()
      else return
      event.preventDefault()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isEnabled, onTurn, onNudge, onPlace])
}
