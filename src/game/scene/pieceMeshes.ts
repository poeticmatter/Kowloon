import * as THREE from 'three'
import type { Vec3 } from '../geometry'
import type { Footprint } from '../placement'

const CUBE_SIZE = 0.94
const WINDOW_RADIUS = 0.27
const WINDOW_DEPTH = 0.1
const GLASS_COLOR = '#bfe3f2'
const RIM_COLOR = '#2b2f36'

const cubeGeometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE)
const rimGeometry = new THREE.CylinderGeometry(WINDOW_RADIUS, WINDOW_RADIUS, WINDOW_DEPTH, 24)
const glassGeometry = new THREE.CylinderGeometry(WINDOW_RADIUS * 0.7, WINDOW_RADIUS * 0.7, WINDOW_DEPTH * 1.2, 24)
const FACING_UP = new THREE.Vector3(0, 1, 0)

// Materials are shared by every piece of the same colour and never disposed: there are only a
// handful (five seat colours, the ghost and the windows).
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
 * One piece as a group of cube meshes and window discs. Each cube mesh remembers its lattice
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

  for (const { cell, normal } of footprint.windows) {
    const facing = new THREE.Vector3(...normal)
    const porthole = new THREE.Group()
    porthole.position.set(cell[0] + 0.5, cell[1] + 0.5, cell[2] + 0.5).addScaledVector(facing, CUBE_SIZE / 2 + WINDOW_DEPTH / 2 - 0.01)
    porthole.quaternion.setFromUnitVectors(FACING_UP, facing)
    porthole.add(new THREE.Mesh(rimGeometry, materialFor(RIM_COLOR, opacity)))
    porthole.add(new THREE.Mesh(glassGeometry, materialFor(GLASS_COLOR, opacity)))
    group.add(porthole)
  }
  return group
}
