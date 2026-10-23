import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as THREE from 'three'
import type { Resource } from '../resources'
import { RESOURCE_ICONS } from '../ResourceIcon'
import type { PlacedToken } from '../tokens'
import { CUBE_SIZE } from './pieceMeshes'

const TOKEN_SIZE = 0.72
const TOKEN_THICKNESS = 0.05
const TOKEN_COLOR = '#ffffff'
const ICON_COLOR = '#262a31'
const TEXTURE_PIXELS = 128
const ICON_PIXELS = 96
/** BoxGeometry's material slots run +x, −x, +y, −y, +z, −z. */
const TOP_FACE = 2

const tokenGeometry = new THREE.BoxGeometry(TOKEN_SIZE, TOKEN_THICKNESS, TOKEN_SIZE)
const edgeMaterial = new THREE.MeshStandardMaterial({ color: TOKEN_COLOR, roughness: 0.5 })

// One material per resource, shared by every token and never disposed: there are only four.
const topMaterials = new Map<Resource, THREE.MeshStandardMaterial>()

/**
 * The resource's Lucide icon drawn on a white square. The SVG loads asynchronously, so the
 * texture starts blank and fills in a moment later.
 */
function iconTexture(resource: Resource): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = TEXTURE_PIXELS
  const context = canvas.getContext('2d')
  if (!context) throw new Error('A 2D canvas is needed to draw the token icons')
  context.fillStyle = TOKEN_COLOR
  context.fillRect(0, 0, TEXTURE_PIXELS, TEXTURE_PIXELS)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const svg = renderToStaticMarkup(createElement(RESOURCE_ICONS[resource], { size: ICON_PIXELS, color: ICON_COLOR, strokeWidth: 2.25 }))
  const image = new Image()
  image.onload = () => {
    const inset = (TEXTURE_PIXELS - ICON_PIXELS) / 2
    context.drawImage(image, inset, inset, ICON_PIXELS, ICON_PIXELS)
    texture.needsUpdate = true
  }
  image.onerror = () => console.error(`Couldn't draw the ${resource} token icon`)
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
  return texture
}

function topMaterialFor(resource: Resource): THREE.MeshStandardMaterial {
  let material = topMaterials.get(resource)
  if (!material) {
    material = new THREE.MeshStandardMaterial({ map: iconTexture(resource), roughness: 0.5 })
    topMaterials.set(resource, material)
  }
  return material
}

/** A flat tile lying on the top face of its cube. */
export function buildTokenMesh({ resource, square }: PlacedToken): THREE.Mesh {
  const materials = Array.from({ length: 6 }, (_, face) => (face === TOP_FACE ? topMaterialFor(resource) : edgeMaterial))
  const token = new THREE.Mesh(tokenGeometry, materials)
  const cubeTop = square[1] + 0.5 + CUBE_SIZE / 2
  token.position.set(square[0] + 0.5, cubeTop + TOKEN_THICKNESS / 2, square[2] + 0.5)
  return token
}
