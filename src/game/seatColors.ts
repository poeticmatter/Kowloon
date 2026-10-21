import type { PlayerAppearance } from 'game-kit/turns'

/** The palette players are dealt from, Okabe-Ito so the colours stay apart with colour blindness. */
export const SEAT_COLORS: readonly PlayerAppearance[] = [
  { name: 'Orange', color: '#e69f00' },
  { name: 'Sky', color: '#56b4e9' },
  { name: 'Green', color: '#009e73' },
  { name: 'Vermillion', color: '#d55e00' },
  { name: 'Purple', color: '#cc79a7' },
]

/** The colour a seat plays in once the table's colours have been rotated `colorShift` places. */
export function seatAppearance(seat: number, colorShift: number): PlayerAppearance {
  return SEAT_COLORS[(seat + colorShift) % SEAT_COLORS.length]
}
