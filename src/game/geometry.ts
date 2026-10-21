/** Integer 3D vectors and the 24 rotations that map a cubic lattice onto itself. y is up. */

export type Vec3 = readonly [number, number, number]

/** Row-major 3×3 rotation matrix. */
export type Matrix3 = readonly [number, number, number, number, number, number, number, number, number]

export type Axis = 0 | 1 | 2

export const ORIGIN: Vec3 = [0, 0, 0]
export const UP: Vec3 = [0, 1, 0]
export const DOWN: Vec3 = [0, -1, 0]

const QUARTER_TURN = Math.PI / 2
const IDENTITY: Matrix3 = [1, 0, 0, 0, 1, 0, 0, 0, 1]

/** A quarter turn about each axis, counter-clockwise looking down the axis towards the origin. */
const QUARTER_TURNS: readonly Matrix3[] = [
  [1, 0, 0, 0, 0, -1, 0, 1, 0],
  [0, 0, 1, 0, 1, 0, -1, 0, 0],
  [0, -1, 0, 1, 0, 0, 0, 0, 1],
]

export function addVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

export function subtractVec(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

export function dotVec(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

export function vecKey(vec: Vec3): string {
  return vec.join(',')
}

export function isSameVec(a: Vec3, b: Vec3): boolean {
  return a[0] === b[0] && a[1] === b[1] && a[2] === b[2]
}

export function applyMatrix(matrix: Matrix3, vec: Vec3): Vec3 {
  return [
    matrix[0] * vec[0] + matrix[1] * vec[1] + matrix[2] * vec[2],
    matrix[3] * vec[0] + matrix[4] * vec[1] + matrix[5] * vec[2],
    matrix[6] * vec[0] + matrix[7] * vec[1] + matrix[8] * vec[2],
  ]
}

/** The matrix that applies `first`, then `second`. */
function multiplyMatrices(second: Matrix3, first: Matrix3): Matrix3 {
  const product = new Array<number>(9)
  for (let row = 0; row < 3; row++) {
    for (let column = 0; column < 3; column++) {
      product[row * 3 + column] = [0, 1, 2].reduce((sum, k) => sum + second[row * 3 + k] * first[k * 3 + column], 0)
    }
  }
  return product as unknown as Matrix3 // nine entries by construction
}

function transpose(matrix: Matrix3): Matrix3 {
  return [matrix[0], matrix[3], matrix[6], matrix[1], matrix[4], matrix[7], matrix[2], matrix[5], matrix[8]]
}

/** All 24 proper rotations (no mirror images), in a fixed order so an index identifies one. */
export const ROTATIONS: readonly Matrix3[] = buildRotations()

function buildRotations(): Matrix3[] {
  const found: Matrix3[] = [IDENTITY]
  const seen = new Set<string>([IDENTITY.join(',')])
  for (let next = 0; next < found.length; next++) {
    for (const turn of QUARTER_TURNS) {
      const candidate = multiplyMatrices(turn, found[next])
      const key = candidate.join(',')
      if (seen.has(key)) continue
      seen.add(key)
      found.push(candidate)
    }
  }
  return found
}

export const ROTATION_COUNT = ROTATIONS.length

export function isRotationIndex(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < ROTATION_COUNT
}

export function rotateVec(orientation: number, vec: Vec3): Vec3 {
  return applyMatrix(ROTATIONS[orientation], vec)
}

/** The orientation reached by turning an object in `orientation` a quarter turn about a fixed world axis. */
export function turnOrientation(orientation: number, axis: Axis, direction: 1 | -1): number {
  const quarterTurn = QUARTER_TURNS[axis]
  // A rotation matrix's inverse is its transpose.
  const turn = direction === 1 ? quarterTurn : transpose(quarterTurn)
  const key = multiplyMatrices(turn, ROTATIONS[orientation]).join(',')
  return ROTATIONS.findIndex(rotation => rotation.join(',') === key)
}

export interface SignedAxis {
  axis: Axis
  sign: 1 | -1
}

export interface ScreenAxes {
  /** The world axis pointing to the viewer's right, snapped to the nearest lattice axis. */
  right: SignedAxis
  /** The world axis pointing away from the viewer along the table. */
  forward: SignedAxis
}

const RIGHT_BY_QUARTER: readonly SignedAxis[] = [
  { axis: 0, sign: 1 },
  { axis: 2, sign: -1 },
  { axis: 0, sign: -1 },
  { axis: 2, sign: 1 },
]
const FORWARD_BY_QUARTER: readonly SignedAxis[] = [
  { axis: 2, sign: -1 },
  { axis: 0, sign: -1 },
  { axis: 2, sign: 1 },
  { axis: 0, sign: 1 },
]

/**
 * The lattice axes that read as "right" and "away" for a camera looking at the table from
 * `azimuth` radians around the vertical axis (0 = from the +z side, growing towards +x).
 */
export function screenAxes(azimuth: number): ScreenAxes {
  const quarter = ((Math.round(azimuth / QUARTER_TURN) % 4) + 4) % 4
  return { right: RIGHT_BY_QUARTER[quarter], forward: FORWARD_BY_QUARTER[quarter] }
}

export function unitVec({ axis, sign }: SignedAxis): Vec3 {
  const vec: [number, number, number] = [0, 0, 0]
  vec[axis] = sign
  return vec
}
