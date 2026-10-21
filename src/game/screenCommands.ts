import { screenAxes, unitVec, type Axis, type SignedAxis, type Vec3 } from './geometry'

// Turning and moving a piece is described from where the player sits ("tip it away from me"),
// then translated to lattice axes using the camera's azimuth, snapped to the nearest side.

export type TurnCommand = 'spin_left' | 'spin_right' | 'tip_away' | 'tip_toward' | 'roll_left' | 'roll_right'
export type NudgeCommand = 'left' | 'right' | 'away' | 'toward' | 'up' | 'down'

export interface WorldTurn {
  axis: Axis
  direction: 1 | -1
}

const VERTICAL: SignedAxis = { axis: 1, sign: 1 }

function turnAbout({ axis, sign }: SignedAxis, direction: 1 | -1): WorldTurn {
  return { axis, direction: sign === direction ? 1 : -1 }
}

/**
 * Quarter turns follow the right-hand rule, so a positive turn about the vertical spins
 * counter-clockwise seen from above, about the viewer's right tips the top towards them,
 * and about the view direction rolls clockwise.
 */
export function worldTurnFor(command: TurnCommand, azimuth: number): WorldTurn {
  const { right, forward } = screenAxes(azimuth)
  switch (command) {
    case 'spin_left':
      return turnAbout(VERTICAL, 1)
    case 'spin_right':
      return turnAbout(VERTICAL, -1)
    case 'tip_toward':
      return turnAbout(right, 1)
    case 'tip_away':
      return turnAbout(right, -1)
    case 'roll_right':
      return turnAbout(forward, 1)
    case 'roll_left':
      return turnAbout(forward, -1)
  }
}

function negate([x, y, z]: Vec3): Vec3 {
  return [-x, -y, -z]
}

export function worldNudgeFor(command: NudgeCommand, azimuth: number): Vec3 {
  const { right, forward } = screenAxes(azimuth)
  switch (command) {
    case 'right':
      return unitVec(right)
    case 'left':
      return negate(unitVec(right))
    case 'away':
      return unitVec(forward)
    case 'toward':
      return negate(unitVec(forward))
    case 'up':
      return unitVec(VERTICAL)
    case 'down':
      return negate(unitVec(VERTICAL))
  }
}
