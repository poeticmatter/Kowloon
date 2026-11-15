import * as THREE from 'three'
import type { Vec3 } from '../geometry'
import type { Footprint } from '../placement'

export const CUBE_SIZE = 0.94

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)

// Materials are shared by every piece of the same colour and never disposed: there are only a
// handful (five seat colours and the ghost).
const materialCache = new Map<string, THREE.MeshStandardMaterial>()

function materialFor(color: string, opacity: number): THREE.MeshStandardMaterial {
  const key = `${color}/${opacity}`
  let material = materialCache.get(key)
  if (!material) {
    const isOpaque = opacity === 1
    material = new THREE.MeshStandardMaterial({ color, roughness: 0.6, transparent: !isOpaque, opacity, depthWrite: isOpaque })
    materialCache.set(key, material)
  }
  return material
}

export interface PieceLook {
  color: string
  /** 1 for a built piece, less for the preview ghost. */
  opacity?: number
}

const CELL_TAG = 'cell'

/** The lattice cell a cube mesh stands for, if it is one. */
export function cellOfMesh(object: THREE.Object3D): Vec3 | null {
  const cell: unknown = object.userData[CELL_TAG]
  return Array.isArray(cell) && cell.length === 3 ? [cell[0], cell[1], cell[2]] : null
}

/**
 * One piece as a group of cube meshes. Each cube mesh remembers its lattice
 * cell so a pointer ray can be turned back into a cell.
 */
export function buildPieceGroup(footprint: Footprint, { color, opacity = 1 }: PieceLook): THREE.Group {
  const group = new THREE.Group()
  const bodyMaterial = materialFor(color, opacity)

  for (const cell of footprint.cells) {
    const cube = new THREE.Mesh(cubeGeometry, bodyMaterial)
    cube.position.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5)
    cube.userData[CELL_TAG] = cell
    group.add(cube)
  }

  return group
}
