import type { PlayerAppearance } from 'game-kit/turns'

/**
 * One look per seat, Okabe-Ito so the colours stay apart with colour blindness. The board
 * draws a seat with SEAT_COLORS[lookOf(seat)], never SEAT_COLORS[seat]: in a solo playtest
 * GameKit gives the seat being played seat 0's look and shuffles the others.
 */
export const SEAT_COLORS: readonly PlayerAppearance[] = [
  { name: 'Orange', color: '#e69f00' },
  { name: 'Sky', color: '#56b4e9' },
  { name: 'Green', color: '#009e73' },
  { name: 'Vermillion', color: '#d55e00' },
  { name: 'Purple', color: '#cc79a7' },
]
