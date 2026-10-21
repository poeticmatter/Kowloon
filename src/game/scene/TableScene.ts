import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { Vec3 } from '../geometry'
import type { AimTarget, Footprint } from '../placement'
import { buildPieceGroup, cellOfMesh } from './pieceMeshes'

const TABLE_THICKNESS = 0.3
const TABLE_COLOR = '#c9b99a'
const GRID_COLOR = '#8f8165'
const INVALID_GHOST_COLOR = '#d6322a'
const GHOST_OPACITY = 0.55
const CLICK_MOVE_LIMIT_PIXELS = 5
const CAMERA_ELEVATION = Math.PI / 4
const CAMERA_DISTANCE_PER_CELL = 1.6
const MAX_PIXEL_RATIO = 2

export interface SceneBuilding {
  footprint: Footprint
  color: string
}

export interface SceneGhost {
  footprint: Footprint
  color: string
  isValid: boolean
}

export interface PointerAim {
  /** Null when the pointer isn't over the table or a piece. */
  target: AimTarget | null
  pointerType: string
}

export interface SceneHandlers {
  onHover: (aim: PointerAim) => void
  onClick: (aim: PointerAim) => void
}

/** The 3D table: renders the buildings and the placement ghost, and turns pointer rays into aims. */
export class TableScene {
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200)
  private readonly controls: OrbitControls
  private readonly raycaster = new THREE.Raycaster()
  private readonly tableCenter: THREE.Vector3
  private readonly tableMesh: THREE.Mesh
  private readonly resizeObserver: ResizeObserver
  private buildings = new THREE.Group()
  private ghost: THREE.Group | null = null
  private handlers: SceneHandlers | null = null
  private pointerDownAt: { x: number; y: number } | null = null
  private animationFrame = 0

  constructor(
    private readonly container: HTMLElement,
    private readonly tableSize: number,
  ) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO))
    this.renderer.domElement.style.touchAction = 'none'
    container.appendChild(this.renderer.domElement)

    this.tableCenter = new THREE.Vector3(tableSize / 2, 0, tableSize / 2)
    this.tableMesh = this.buildTable()
    this.scene.add(this.tableMesh, this.buildGrid(), this.buildings)
    this.addLights()

    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.target.copy(this.tableCenter)
    this.controls.enablePan = false
    this.controls.maxPolarAngle = Math.PI * 0.48
    this.controls.minDistance = tableSize * 0.6
    this.controls.maxDistance = tableSize * 3
    this.viewFromAzimuth(0)

    const canvas = this.renderer.domElement
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    this.resizeObserver = new ResizeObserver(() => this.resize())
    this.resizeObserver.observe(container)
    this.resize()
    this.renderLoop()
  }

  setHandlers(handlers: SceneHandlers): void {
    this.handlers = handlers
  }

  setBuildings(buildings: readonly SceneBuilding[]): void {
    this.scene.remove(this.buildings)
    this.buildings = new THREE.Group()
    for (const { footprint, color } of buildings) this.buildings.add(buildPieceGroup(footprint, { color }))
    this.scene.add(this.buildings)
  }

  setGhost(ghost: SceneGhost | null): void {
    if (this.ghost) this.scene.remove(this.ghost)
    this.ghost = null
    if (!ghost) return
    const color = ghost.isValid ? ghost.color : INVALID_GHOST_COLOR
    this.ghost = buildPieceGroup(ghost.footprint, { color, opacity: GHOST_OPACITY })
    this.scene.add(this.ghost)
  }

  /** Swings the camera round the table to look at it from `azimuth` radians (0 = from the +z side). */
  viewFromAzimuth(azimuth: number): void {
    const distance = this.tableSize * CAMERA_DISTANCE_PER_CELL
    const horizontal = Math.cos(CAMERA_ELEVATION) * distance
    this.camera.position.set(
      this.tableCenter.x + Math.sin(azimuth) * horizontal,
      Math.sin(CAMERA_ELEVATION) * distance,
      this.tableCenter.z + Math.cos(azimuth) * horizontal,
    )
    this.controls.update()
  }

  /** Where the camera currently is around the table, in the same terms as viewFromAzimuth. */
  getAzimuth(): number {
    return Math.atan2(this.camera.position.x - this.tableCenter.x, this.camera.position.z - this.tableCenter.z)
  }

  dispose(): void {
    cancelAnimationFrame(this.animationFrame)
    this.resizeObserver.disconnect()
    this.controls.dispose()
    this.renderer.dispose()
    this.renderer.domElement.remove()
  }

  private buildTable(): THREE.Mesh {
    const table = new THREE.Mesh(
      new THREE.BoxGeometry(this.tableSize, TABLE_THICKNESS, this.tableSize),
      new THREE.MeshStandardMaterial({ color: TABLE_COLOR, roughness: 0.9 }),
    )
    table.position.set(this.tableSize / 2, -TABLE_THICKNESS / 2, this.tableSize / 2)
    return table
  }

  private buildGrid(): THREE.GridHelper {
    const grid = new THREE.GridHelper(this.tableSize, this.tableSize, GRID_COLOR, GRID_COLOR)
    // Lifted a hair so the lines don't flicker against the table top.
    grid.position.set(this.tableSize / 2, 0.005, this.tableSize / 2)
    return grid
  }

  private addLights(): void {
    const sun = new THREE.DirectionalLight('#ffffff', 2.2)
    sun.position.set(this.tableSize, this.tableSize * 1.5, this.tableSize * 0.4)
    this.scene.add(new THREE.HemisphereLight('#ffffff', '#7d7a70', 1.6), sun)
  }

  private resize(): void {
    const { clientWidth, clientHeight } = this.container
    if (clientWidth === 0 || clientHeight === 0) return
    this.renderer.setSize(clientWidth, clientHeight)
    this.camera.aspect = clientWidth / clientHeight
    this.camera.updateProjectionMatrix()
  }

  private renderLoop = (): void => {
    this.animationFrame = requestAnimationFrame(this.renderLoop)
    this.renderer.render(this.scene, this.camera)
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerDownAt = { x: event.clientX, y: event.clientY }
  }

  // Only a mouse hovers; touch players tap to aim.
  private handlePointerMove = (event: PointerEvent): void => {
    if (event.buttons !== 0 || event.pointerType !== 'mouse') return
    this.handlers?.onHover({ target: this.aimAt(event), pointerType: event.pointerType })
  }

  // A press that barely moved is a click; anything more was the camera being dragged round.
  private handlePointerUp = (event: PointerEvent): void => {
    const start = this.pointerDownAt
    this.pointerDownAt = null
    if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > CLICK_MOVE_LIMIT_PIXELS) return
    this.handlers?.onClick({ target: this.aimAt(event), pointerType: event.pointerType })
  }

  private aimAt(event: PointerEvent): AimTarget | null {
    const bounds = this.renderer.domElement.getBoundingClientRect()
    const pointer = new THREE.Vector2(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    this.raycaster.setFromCamera(pointer, this.camera)
    const cubes = this.buildings.children.flatMap(piece => piece.children)
    const hit = this.raycaster.intersectObjects([this.tableMesh, ...cubes], false)[0]
    if (!hit) return null
    return hit.object === this.tableMesh ? this.aimAtTable(hit.point) : this.aimAtCube(hit)
  }

  private aimAtTable(point: THREE.Vector3): AimTarget | null {
    const cell: Vec3 = [Math.floor(point.x), 0, Math.floor(point.z)]
    const isOnTable = cell[0] >= 0 && cell[0] < this.tableSize && cell[2] >= 0 && cell[2] < this.tableSize
    return isOnTable ? { cell, normal: [0, 1, 0] } : null
  }

  // Window discs carry no cell, so a ray that hits one aims at nothing.
  private aimAtCube(hit: THREE.Intersection): AimTarget | null {
    const cell = cellOfMesh(hit.object)
    if (!cell || !hit.face) return null
    const normal: Vec3 = [Math.round(hit.face.normal.x), Math.round(hit.face.normal.y), Math.round(hit.face.normal.z)]
    return { cell: [cell[0] + normal[0], cell[1] + normal[1], cell[2] + normal[2]], normal }
  }
}
