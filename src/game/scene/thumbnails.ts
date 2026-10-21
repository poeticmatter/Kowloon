import * as THREE from 'three'
import { PIECES } from '../catalog'
import { footprintOf } from '../placement'
import { buildPieceGroup } from './pieceMeshes'

const THUMBNAIL_PIXELS = 96
const THUMBNAIL_COLOR = '#9aa3b0'
const UNTURNED = 0

let cachedThumbnails: ReadonlyMap<string, string> | null = null

/**
 * A picture of every piece in the catalog, as image URLs keyed by piece id. Drawn once with a
 * throwaway renderer, so the tray doesn't need a WebGL context per button.
 */
export function pieceThumbnails(): ReadonlyMap<string, string> {
  if (cachedThumbnails) return cachedThumbnails

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setSize(THUMBNAIL_PIXELS, THUMBNAIL_PIXELS)
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50)
  const scene = new THREE.Scene()
  const sun = new THREE.DirectionalLight('#ffffff', 2.2)
  sun.position.set(3, 5, 2)
  scene.add(new THREE.HemisphereLight('#ffffff', '#7d7a70', 1.6), sun)

  const thumbnails = new Map<string, string>()
  for (const piece of PIECES) {
    const group = buildPieceGroup(footprintOf({ pieceId: piece.id, orientation: UNTURNED, origin: [0, 0, 0] }), { color: THUMBNAIL_COLOR })
    const bounds = new THREE.Box3().setFromObject(group)
    const center = bounds.getCenter(new THREE.Vector3())
    const radius = bounds.getSize(new THREE.Vector3()).length() / 2
    camera.position.copy(center).add(new THREE.Vector3(1, 0.9, 1.3).normalize().multiplyScalar(radius * 3.2))
    camera.lookAt(center)
    scene.add(group)
    renderer.render(scene, camera)
    thumbnails.set(piece.id, renderer.domElement.toDataURL())
    scene.remove(group)
  }

  renderer.dispose()
  renderer.forceContextLoss()
  cachedThumbnails = thumbnails
  return thumbnails
}
