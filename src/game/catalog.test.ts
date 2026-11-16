import { describe, expect, it } from 'vitest'
import { PIECES } from './catalog'
import { ROTATION_COUNT, ROTATIONS, screenAxes, turnOrientation, vecKey } from './geometry'
import { footprintOf, originForAim } from './placement'

const UNTURNED = 0

describe('the piece catalog', () => {
  it('has distinct ids', () => {
    expect(new Set(PIECES.map(piece => piece.id)).size).toBe(PIECES.length)
  })

  it.each(PIECES.map(piece => [piece.id, piece] as const))('%s has distinct cubes around the pivot', (_id, piece) => {
    expect(new Set(piece.cells.map(vecKey)).size).toBe(piece.size)
    expect(piece.size).toBeGreaterThanOrEqual(1)
    expect(piece.size).toBeLessThanOrEqual(5)
    expect(piece.cells[0]).toEqual([0, 0, 0])
  })

  it.each([
    ['cube', 7],
    ['domino', 3],
    ['line3', 2],
    ['corner3', 2],
    ['bar', 1],
    ['spur', 1],
  ])('gives each seat %s x%i', (pieceId, quota) => {
    expect(PIECES.find(piece => piece.id === pieceId)?.quota).toBe(quota)
  })

  it('has a piece of every size', () => {
    expect(new Set(PIECES.map(piece => piece.size))).toEqual(new Set([1, 2, 3, 4, 5]))
  })

  it('keeps every piece connected', () => {
    for (const piece of PIECES) {
      const remaining = new Set(piece.cells.map(vecKey))
      const frontier = [piece.cells[0]]
      remaining.delete(vecKey(piece.cells[0]))
      while (frontier.length > 0) {
        const [x, y, z] = frontier.pop()!
        for (const neighbor of [[x + 1, y, z], [x - 1, y, z], [x, y + 1, z], [x, y - 1, z], [x, y, z + 1], [x, y, z - 1]] as const) {
          if (remaining.delete(vecKey(neighbor))) frontier.push(neighbor)
        }
      }
      expect(remaining.size, piece.id).toBe(0)
    }
  })
})

describe('rotations', () => {
  it('are the 24 distinct proper rotations', () => {
    expect(ROTATION_COUNT).toBe(24)
    expect(new Set(ROTATIONS.map(rotation => rotation.join(','))).size).toBe(24)
  })

  it('return to the start after four quarter turns', () => {
    const turned = [1, 2, 3, 4].reduce(orientation => turnOrientation(orientation, 1, 1), 5)
    expect(turned).toBe(5)
  })

  it('undo a turn with the opposite turn', () => {
    expect(turnOrientation(turnOrientation(7, 0, 1), 0, -1)).toBe(7)
  })

  it('cannot turn the right screw into the left screw', () => {
    const shapeOf = (pieceId: string, orientation: number) =>
      footprintOf({ pieceId, orientation, origin: [0, 0, 0] })
        .cells.map(vecKey)
        .sort()
        .join('|')
    const leftShapes = new Set(ROTATIONS.map((_, orientation) => shapeOf('left-screw', orientation)))
    expect(leftShapes.has(shapeOf('right-screw', UNTURNED))).toBe(false)
  })

  it('reads the camera’s right-hand side from its azimuth', () => {
    expect(screenAxes(0).right).toEqual({ axis: 0, sign: 1 })
    expect(screenAxes(Math.PI / 2).right).toEqual({ axis: 2, sign: -1 })
    expect(screenAxes(Math.PI).forward).toEqual({ axis: 2, sign: 1 })
  })
})

describe('aiming a piece', () => {
  it('rests a piece on the table where it is aimed', () => {
    const origin = originForAim({ pieceId: 'tripod', orientation: UNTURNED }, { cell: [3, 0, 3], normal: [0, 1, 0] })
    const lowest = Math.min(...footprintOf({ pieceId: 'tripod', orientation: UNTURNED, origin }).cells.map(cell => cell[1]))
    expect(lowest).toBe(0)
  })
})
