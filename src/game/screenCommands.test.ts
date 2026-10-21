import { describe, expect, it } from 'vitest'
import { rotateVec, turnOrientation, type Vec3 } from './geometry'
import { worldNudgeFor, worldTurnFor, type TurnCommand } from './screenCommands'

const FROM_SOUTH = 0 // camera on the +z side, looking towards -z
const FROM_EAST = Math.PI / 2 // camera on the +x side, looking towards -x
const UNTURNED = 0

/** Where a vector pointing `start` ends up after the command, seen from `azimuth`. */
function afterTurn(command: TurnCommand, azimuth: number, start: Vec3): Vec3 {
  const { axis, direction } = worldTurnFor(command, azimuth)
  return rotateVec(turnOrientation(UNTURNED, axis, direction), start)
}

describe('turning from the viewer’s seat', () => {
  it('tips the top away from the viewer', () => {
    expect(afterTurn('tip_away', FROM_SOUTH, [0, 1, 0])).toEqual([0, 0, -1])
    expect(afterTurn('tip_away', FROM_EAST, [0, 1, 0])).toEqual([-1, 0, 0])
  })

  it('spins left as counter-clockwise from above', () => {
    // Seen from above with the viewer at the bottom, the right side swings to the far side.
    expect(afterTurn('spin_left', FROM_SOUTH, [1, 0, 0])).toEqual([0, 0, -1])
  })

  it('rolls the top towards the viewer’s right', () => {
    expect(afterTurn('roll_right', FROM_SOUTH, [0, 1, 0])).toEqual([1, 0, 0])
    expect(afterTurn('roll_right', FROM_EAST, [0, 1, 0])).toEqual([0, 0, -1])
  })
})

describe('moving from the viewer’s seat', () => {
  it('moves right along the viewer’s right-hand side', () => {
    expect(worldNudgeFor('right', FROM_SOUTH)).toEqual([1, 0, 0])
    expect(worldNudgeFor('right', FROM_EAST)).toEqual([0, 0, -1])
  })

  it('moves away from the viewer', () => {
    expect(worldNudgeFor('away', FROM_EAST)).toEqual([-1, 0, 0])
  })
})
