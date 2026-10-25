import { useState } from 'react'

// How much the board tells a player about where things can go. Each mode tells everything the one
// before it does, and a little more.

export type ViewMode = 'realistic' | 'helpful' | 'complete' | 'computational'

export const VIEW_MODES: readonly ViewMode[] = ['realistic', 'helpful', 'complete', 'computational']

export const VIEW_MODE_LABELS: Record<ViewMode, string> = {
  realistic: 'Realistic',
  helpful: 'Helpful',
  complete: 'Complete',
  computational: 'Computational',
}

export const VIEW_MODE_HINTS: Record<ViewMode, string> = {
  realistic: 'You find out whether a placement is valid only when you try it.',
  helpful: 'Tells you whether a placement is valid before you place.',
  complete: 'Picking a card or a building shows every valid location and which of the other can go with it.',
  computational: 'Also counts the valid placements in the current game state.',
}

const STORAGE_KEY = 'kowloon.viewMode'
const DEFAULT_VIEW_MODE: ViewMode = 'helpful'

/** Tells the player, before they place, whether the placement is valid. */
export function showsLiveValidity(mode: ViewMode): boolean {
  return mode !== 'realistic'
}

/** Shows every valid location and the cards and buildings that fit the current pick. */
export function showsHints(mode: ViewMode): boolean {
  return mode === 'complete' || mode === 'computational'
}

export function showsCounts(mode: ViewMode): boolean {
  return mode === 'computational'
}

function isViewMode(value: unknown): value is ViewMode {
  return VIEW_MODES.some(mode => mode === value)
}

function storedViewMode(): ViewMode {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return isViewMode(stored) ? stored : DEFAULT_VIEW_MODE
  } catch {
    // Storage can be blocked (private windows); the mode just isn't remembered then.
    return DEFAULT_VIEW_MODE
  }
}

/** The player's chosen view mode, remembered in this browser. It is theirs alone, not part of the game. */
export function useViewMode(): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(storedViewMode)
  const choose = (next: ViewMode) => {
    setMode(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // Not remembering the choice is harmless.
    }
  }
  return [mode, choose]
}
