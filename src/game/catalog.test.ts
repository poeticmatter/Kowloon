import { describe, expect, it } from 'vitest'
import { PIECES } from './catalog'
import { ROTATION_COUNT, ROTATIONS, screenAxes, turnOrientation, vecKey } from './geometry'
import { footprintOf, originForAim, windowFront } from './placement'

const UNTURNED = 0

describe('the piece catalog', () => {
  it('has distinct ids', () => {
    expect(new Set(PIECES.map(piece => piece.id)).size).toBe(PIECES.length)
  })

  it.each(PIECES.map(piece => [piece.id, piece] as const))('%s is four cubes with outward windows facing different ways', (_id, piece) => {
    const cellKeys = new Set(piece.cells.map(vecKey))
    expect(cellKeys.size).toBe(4)
    expect(piece.cells[0]).toEqual([0, 0, 0])
    expect(piece.windows.length).toBeGreaterThanOrEqual(1)
    expect(piece.windows.length).toBeLessThanOrEqual(4)
    for (const window of piece.windows) {
      const front = windowFront({ cell: piece.cells[window.cell], normal: window.normal })
      expect(cellKeys.has(vecKey(front))).toBe(false)
    }
    expect(new Set(piece.windows.map(window => vecKey(window.normal))).size).toBe(piece.windows.length)
  })

  it.each([
    ['bar', 4],
    ['square', 2],
    ['tee', 2],
    ['ell', 2],
    ['skew', 2],
  ])('gives the flat %s a window on each of its flat sides', (pieceId, windowCount) => {
    const piece = PIECES.find(candidate => candidate.id === pieceId)!
    expect(piece.windows).toHaveLength(windowCount)
    // The four-cube layer lies in y = 0, so its flat sides are up and down; the bar adds its two long sides.
    const normals = new Set(piece.windows.map(window => vecKey(window.normal)))
    expect(normals.has(vecKey([0, 1, 0]))).toBe(true)
    expect(normals.has(vecKey([0, -1, 0]))).toBe(true)
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
    const leftShapes = new Set(ROTATIONS.map((_, orientation) => shapeOf('left-screw-end', orientation)))
    expect(leftShapes.has(shapeOf('right-screw-end', UNTURNED))).toBe(false)
  })

  it('reads the camera’s right-hand side from its azimuth', () => {
    expect(screenAxes(0).right).toEqual({ axis: 0, sign: 1 })
    expect(screenAxes(Math.PI / 2).right).toEqual({ axis: 2, sign: -1 })
    expect(screenAxes(Math.PI).forward).toEqual({ axis: 2, sign: 1 })
  })
})

describe('aiming a piece', () => {
  it('rests a piece on the table where it is aimed', () => {
    const origin = originForAim({ pieceId: 'tripod-peak', orientation: UNTURNED }, { cell: [3, 0, 3], normal: [0, 1, 0] })
    const lowest = Math.min(...footprintOf({ pieceId: 'tripod-peak', orientation: UNTURNED, origin }).cells.map(cell => cell[1]))
    expect(lowest).toBe(0)
  })
})
