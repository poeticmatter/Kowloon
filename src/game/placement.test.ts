import { describe, expect, it } from 'vitest'
import { builtTableOf, footprintKey, footprintOf, placementProblem, type Footprint } from './placement'
import { coveredSeats, placementOptions, pieceIdsOfSizes } from './play'
import type { Placement, PlacedPiece } from './types'
import type { Vec3 } from './geometry'

const UNTURNED = 0
const TABLE_SIZE = 5

// A tripod lying on the table at (1,0,1) rests on the table squares (1,1), (2,1) and (1,2).
const TRIPOD: Placement = { pieceId: 'tripod', orientation: UNTURNED, origin: [1, 0, 1] }

function piecesOf(placements: Placement[], owner = 0): PlacedPiece[] {
  return placements.map((placement, index) => ({ ...placement, id: index + 1, owner }))
}

function tableOf(placements: Placement[] = [], tableSize = TABLE_SIZE) {
  return builtTableOf({ tableSize, pieces: piecesOf(placements) })
}

function shape(cells: Vec3[]): Footprint {
  return { cells }
}

/** Four cubes in a row along x from the origin. */
const ROW: Vec3[] = [[0, 0, 0], [1, 0, 0], [2, 0, 0], [3, 0, 0]]

describe('where a piece may rest', () => {
  it('lets a piece overhang the table when more of it rests on the table than hangs in the air', () => {
    expect(placementProblem(tableOf([], 3), shape(ROW))).toBeNull()
  })

  it('refuses a piece with as much hanging in the air as resting on the table', () => {
    expect(placementProblem(tableOf([], 2), shape(ROW))).toMatch(/hangs in the air/)
  })

  it('refuses a piece that rests on nothing', () => {
    expect(placementProblem(tableOf(), shape([[2, 3, 2]]))).toMatch(/Rest it/)
  })

  it('lets a piece rest on a building', () => {
    expect(placementProblem(tableOf([TRIPOD]), shape([[2, 1, 1]]))).toBeNull()
  })

  it('refuses a piece that sinks below the table top', () => {
    expect(placementProblem(tableOf(), shape([[2, -1, 2]]))).toMatch(/between the table top/)
  })

  it('refuses a piece that overlaps another', () => {
    expect(placementProblem(tableOf([TRIPOD]), shape([[2, 0, 1]]))).toMatch(/already taken/)
  })

  it('lets a flat piece lie on the table', () => {
    const lying = footprintOf({ pieceId: 'square', orientation: UNTURNED, origin: [1, 0, 1] })
    expect(placementProblem(tableOf(), lying)).toBeNull()
  })
})

describe('finding the valid placements', () => {
  it('finds exactly the placements the rules accept', () => {
    const table = tableOf([TRIPOD])
    const found = new Set([...placementOptions(table, pieceIdsOfSizes([3]))].map(footprintKey))
    expect(found.size).toBeGreaterThan(0)
    for (const key of found) {
      const cells = key.split(';').map(cell => cell.split(',').map(Number) as unknown as Vec3)
      expect(placementProblem(table, { cells })).toBeNull()
    }
  })
})

describe('covering', () => {
  const owned = piecesOf([TRIPOD], 1)

  it('names the seat whose piece the new one rests on', () => {
    const above = shape([[2, 1, 1]])
    expect(coveredSeats(owned, above, 0, 3)).toEqual([1])
  })

  it('names nobody for a piece resting on the table', () => {
    expect(coveredSeats(owned, shape([[4, 0, 4]]), 0, 3)).toEqual([])
  })

  it('does not count the builder’s own pieces', () => {
    expect(coveredSeats(owned, shape([[2, 1, 1]]), 1, 3)).toEqual([])
  })

  it('ignores neutral size 5 pieces', () => {
    const longBar = piecesOf([{ pieceId: 'long-bar', orientation: UNTURNED, origin: [2, 0, 1] }], 1)
    expect(coveredSeats(longBar, shape([[2, 1, 1]]), 0, 3)).toEqual([])
  })

  it('names a seat once however many of its pieces are covered', () => {
    const twoPieces = piecesOf([TRIPOD, { pieceId: 'cube', orientation: UNTURNED, origin: [3, 0, 3] }], 1)
    expect(coveredSeats(twoPieces, shape([[2, 1, 1], [3, 1, 3]]), 0, 2)).toEqual([1])
  })
})
