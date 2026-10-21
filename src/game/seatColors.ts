import type { PlayerAppearance } from 'game-kit/turns'

/** One colour per seat, from the Okabe-Ito palette so they stay apart with colour blindness. */
export const SEAT_COLORS: readonly PlayerAppearance[] = [
  { name: 'Orange', color: '#e69f00' },
  { name: 'Sky', color: '#56b4e9' },
  { name: 'Green', color: '#009e73' },
  { name: 'Vermillion', color: '#d55e00' },
  { name: 'Purple', color: '#cc79a7' },
]
