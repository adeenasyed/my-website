import * as THREE from 'three'
import { getMeshes } from '../helpers.js'
import { easeInOut, ZOOM_DURATION } from '../../zoom.js'
import { BLACK, FONT_FAMILY } from '@/theme.js'

const PAGE_WIDTH = 72
const PAGE_DEPTH = 48
const PAGE_HEIGHT = 4.2
const COVER_THICKNESS = 1.8
const LAYER_GAP = 0.04
const SPINE_SURFACE_INSET = 0.08
const CANVAS_WIDTH = 1024
const CANVAS_HEIGHT = 640
const COVER_BORDER_INSET = 38
const COVER_BORDER_WIDTH = 12
const PAPER_COLOR = '#F7F0DF'
const PENCIL_WIDTH = 5
const ERASER_WIDTH = 18
const LEFT_PAGE_SPINE_OVERLAP = 1.75
const VISIBILITY_CHECK_TIMEOUT = 250

function createCoverTexture(maxAnisotropy) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  context.fillStyle = '#0A0A0A'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#F0D080'
  context.fillRect(
    COVER_BORDER_INSET,
    COVER_BORDER_INSET,
    canvas.width - COVER_BORDER_INSET * 2,
    COVER_BORDER_WIDTH,
  )
  context.fillRect(
    COVER_BORDER_INSET,
    canvas.height - COVER_BORDER_INSET - COVER_BORDER_WIDTH,
    canvas.width - COVER_BORDER_INSET * 2,
    COVER_BORDER_WIDTH,
  )
  context.fillRect(
    COVER_BORDER_INSET,
    COVER_BORDER_INSET + COVER_BORDER_WIDTH,
    COVER_BORDER_WIDTH,
    canvas.height - (COVER_BORDER_INSET + COVER_BORDER_WIDTH) * 2,
  )
  context.fillRect(
    canvas.width - COVER_BORDER_INSET - COVER_BORDER_WIDTH,
    COVER_BORDER_INSET + COVER_BORDER_WIDTH,
    COVER_BORDER_WIDTH,
    canvas.height - (COVER_BORDER_INSET + COVER_BORDER_WIDTH) * 2,
  )
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  context.font = `700 64px ${FONT_FAMILY}`
  context.fillText('VISITOR BOOK', canvas.width / 2, canvas.height / 2)

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return texture
}

function createPageCanvas(maxAnisotropy) {
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_WIDTH
  canvas.height = CANVAS_HEIGHT
  const context = canvas.getContext('2d')
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy

  function drawBackground() {
    context.fillStyle = PAPER_COLOR
    context.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
  }

  drawBackground()
  return { context, texture, drawBackground }
}

function createPageEdgeTexture(maxAnisotropy) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 50
  const context = canvas.getContext('2d')
  context.fillStyle = PAPER_COLOR
  context.fillRect(0, 0, canvas.width, canvas.height)

  for (let y = 4, line = 0; y < canvas.height; y += 5, line += 1) {
    context.fillStyle = line % 2 === 0 ? '#C4BAA5' : '#D8CEBB'
    context.fillRect(0, y, canvas.width, 1)
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = maxAnisotropy
  return texture
}

function drawStroke(context, stroke, mirrorX = false, compositeOperation = 'source-over') {
  const pointX = (point) => {
    const x = (point[0] * 2 - 1) * CANVAS_WIDTH
    return mirrorX ? CANVAS_WIDTH - x : x
  }
  context.save()
  context.globalCompositeOperation = compositeOperation
  context.strokeStyle = stroke.tool === 'pencil' ? BLACK : PAPER_COLOR
  context.lineWidth = stroke.tool === 'pencil' ? PENCIL_WIDTH : ERASER_WIDTH
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.beginPath()
  for (const [index, point] of stroke.points.entries()) {
    const x = pointX(point)
    const y = point[1] * CANVAS_HEIGHT
    if (index === 0) context.moveTo(x, y)
    else context.lineTo(x, y)
  }
  if (stroke.points.length === 1) context.lineTo(
    pointX(stroke.points[0]) + 0.1,
    stroke.points[0][1] * CANVAS_HEIGHT + 0.1,
  )
  context.stroke()
  context.restore()
}

export function loadVisitorBook(tvStandBox, maxAnisotropy) {
  const visitorBook = new THREE.Group()
  visitorBook.rotation.y = -Math.PI / 2.05

  const coverTexture = createCoverTexture(maxAnisotropy)
  const rightPageCanvas = createPageCanvas(maxAnisotropy)
  const leftPageCanvas = createPageCanvas(maxAnisotropy)
  const inkMask = document.createElement('canvas')
  inkMask.width = CANVAS_WIDTH
  inkMask.height = CANVAS_HEIGHT
  const inkMaskContext = inkMask.getContext('2d', { willReadFrequently: true })
  const coverMaterial = new THREE.MeshStandardMaterial({ color: BLACK })
  const paperMaterial = new THREE.MeshStandardMaterial({ color: PAPER_COLOR })
  const pageEdgeMaterial = new THREE.MeshStandardMaterial({
    map: createPageEdgeTexture(maxAnisotropy),
  })

  const bottomCover = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_WIDTH + 3, COVER_THICKNESS, PAGE_DEPTH + 3),
    coverMaterial,
  )
  bottomCover.position.set(PAGE_WIDTH / 2, COVER_THICKNESS / 2, 0)

  const pageBlock = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_DEPTH),
    [
      pageEdgeMaterial,
      pageEdgeMaterial,
      paperMaterial,
      paperMaterial,
      pageEdgeMaterial,
      pageEdgeMaterial,
    ],
  )
  const pageBlockBottom = COVER_THICKNESS + LAYER_GAP
  const pageBlockTop = pageBlockBottom + PAGE_HEIGHT
  pageBlock.position.set(PAGE_WIDTH / 2, pageBlockBottom + PAGE_HEIGHT / 2, 0)

  function createPageMesh(page, x, width = PAGE_WIDTH - 1.2) {
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(width, PAGE_DEPTH - 1.2),
      new THREE.MeshStandardMaterial({ map: page.texture, side: THREE.DoubleSide }),
    )
    mesh.rotation.x = -Math.PI / 2
    mesh.position.set(x, pageBlockTop + 0.08, 0)
    return mesh
  }

  const rightPage = createPageMesh(rightPageCanvas, PAGE_WIDTH / 2)
  const pageNavigationAnchor = new THREE.Object3D()
  pageNavigationAnchor.position.set(0, pageBlockTop + 0.2, (PAGE_DEPTH + 3) / 2 + 6)

  const coverPivot = new THREE.Group()
  coverPivot.position.y = pageBlockTop + LAYER_GAP + COVER_THICKNESS / 2
  const topCover = new THREE.Mesh(
    new THREE.BoxGeometry(PAGE_WIDTH + 3, COVER_THICKNESS, PAGE_DEPTH + 3),
    [
      coverMaterial,
      coverMaterial,
      new THREE.MeshStandardMaterial({ map: coverTexture }),
      coverMaterial,
      coverMaterial,
      coverMaterial,
    ],
  )
  topCover.position.x = PAGE_WIDTH / 2
  const toolbarAnchor = new THREE.Object3D()
  toolbarAnchor.position.set(-PAGE_WIDTH / 2 + 6, -COVER_THICKNESS / 2 - 0.02, 0)
  topCover.add(toolbarAnchor)
  const leftPageWidth = PAGE_WIDTH - 1.2 + LEFT_PAGE_SPINE_OVERLAP
  const leftPage = createPageMesh(
    leftPageCanvas,
    (PAGE_WIDTH - 1.2 - LEFT_PAGE_SPINE_OVERLAP) / 2,
    leftPageWidth,
  )
  leftPage.position.y = -COVER_THICKNESS / 2 - 0.03
  leftPage.visible = false
  coverPivot.add(topCover, leftPage)

  const bookHeight = pageBlockTop + LAYER_GAP + COVER_THICKNESS
  const spineHeight = bookHeight - SPINE_SURFACE_INSET
  const spineDepth = PAGE_DEPTH + 3 - SPINE_SURFACE_INSET * 2
  const spine = new THREE.Mesh(
    new THREE.BoxGeometry(3.5, spineHeight, spineDepth),
    coverMaterial,
  )
  spine.position.set(0, spineHeight / 2, 0)

  visitorBook.add(bottomCover, pageBlock, rightPage, coverPivot, spine, pageNavigationAnchor)

  const targetCenter = tvStandBox.getCenter(new THREE.Vector3())
  const visitorBookBox = new THREE.Box3().setFromObject(visitorBook)
  const visitorBookCenter = visitorBookBox.getCenter(new THREE.Vector3())
  visitorBook.position.set(
    targetCenter.x - visitorBookCenter.x,
    tvStandBox.max.y - visitorBookBox.min.y,
    targetCenter.z - visitorBookCenter.z + 100,
  )

  let entries = []
  let strokes = []
  let undoneStrokes = []
  let activeStroke = null
  let pageIndex = 0
  let tool = 'pencil'
  let onDrawingChange = null
  let hasDrawing = false
  let visibilityCheckId = null
  let openStart = 0
  let openTarget = 0
  let openProgress = 0
  let openElapsed = ZOOM_DURATION

  function redraw() {
    rightPageCanvas.drawBackground()
    leftPageCanvas.drawBackground()
    leftPage.visible = pageIndex > 0
    if (pageIndex === 0) {
      for (const stroke of strokes) drawStroke(rightPageCanvas.context, stroke)
      if (activeStroke) drawStroke(rightPageCanvas.context, activeStroke)
    } else {
      const firstEntryIndex = (pageIndex - 1) * 2
      const leftEntry = entries[firstEntryIndex]
      const rightEntry = entries[firstEntryIndex + 1]
      for (const stroke of leftEntry.strokes) {
        drawStroke(leftPageCanvas.context, stroke, true)
      }
      for (const stroke of rightEntry?.strokes ?? []) {
        drawStroke(rightPageCanvas.context, stroke)
      }
    }
    rightPageCanvas.texture.needsUpdate = true
    leftPageCanvas.texture.needsUpdate = true
  }

  function pointFromUv(uv) {
    return [(1 + uv.x) / 2, 1 - uv.y]
  }

  function drawOnRightPage(stroke) {
    drawStroke(rightPageCanvas.context, stroke)
    rightPageCanvas.texture.needsUpdate = true
  }

  function hasVisibleDrawing() {
    inkMaskContext.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)
    for (const stroke of strokes) {
      const compositeOperation = stroke.tool === 'pencil' ? 'source-over' : 'destination-out'
      drawStroke(inkMaskContext, stroke, false, compositeOperation)
    }
    const pixels = inkMaskContext.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT).data
    for (let index = 3; index < pixels.length; index += 4) {
      if (pixels[index] > 8) return true
    }
    return false
  }

  function updateHasDrawing(nextHasDrawing) {
    if (nextHasDrawing === hasDrawing) return
    hasDrawing = nextHasDrawing
    onDrawingChange?.(hasDrawing)
  }

  function cancelVisibilityCheck() {
    if (visibilityCheckId === null) return
    if ('requestIdleCallback' in window) window.cancelIdleCallback(visibilityCheckId)
    else window.clearTimeout(visibilityCheckId)
    visibilityCheckId = null
  }

  function scheduleVisibilityCheck() {
    const run = () => {
      visibilityCheckId = null
      updateHasDrawing(hasVisibleDrawing())
    }

    // Keep the expensive ink canvas read out of pointerup so the next stroke
    // can begin without waiting for it.
    if ('requestIdleCallback' in window) {
      visibilityCheckId = window.requestIdleCallback(run, { timeout: VISIBILITY_CHECK_TIMEOUT })
    } else {
      visibilityCheckId = window.setTimeout(run, VISIBILITY_CHECK_TIMEOUT)
    }
  }

  function setOpen(open) {
    const target = open ? 1 : 0
    if (target === openTarget) return
    openStart = openProgress
    openTarget = target
    openElapsed = 0
    if (!open) {
      pageIndex = 0
      activeStroke = null
      redraw()
    }
  }

  function setEntries(nextEntries) {
    entries = nextEntries
    redraw()
  }

  function setPage(nextPageIndex) {
    pageIndex = nextPageIndex
    activeStroke = null
    redraw()
  }

  function setTool(nextTool) {
    tool = nextTool
  }

  function setDrawingListener(listener) {
    onDrawingChange = listener
    listener?.(hasDrawing)
  }

  function beginStroke(uv) {
    cancelVisibilityCheck()
    const point = pointFromUv(uv)
    activeStroke = {
      tool,
      points: [point],
    }
    drawOnRightPage(activeStroke)
  }

  function continueStroke(uv) {
    const next = pointFromUv(uv)
    const previous = activeStroke.points[activeStroke.points.length - 1]
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 0.002) return
    activeStroke.points.push(next)
    drawOnRightPage({
      tool: activeStroke.tool,
      points: [previous, next],
    })
  }

  function endStroke() {
    const addsInk = activeStroke.tool === 'pencil'
    strokes.push(activeStroke)
    undoneStrokes = []
    activeStroke = null
    if (addsInk) updateHasDrawing(true)
    else if (hasDrawing) scheduleVisibilityCheck()
  }

  function getStrokes() {
    return strokes
  }

  function clear() {
    cancelVisibilityCheck()
    strokes = []
    undoneStrokes = []
    updateHasDrawing(false)
    redraw()
  }

  function undo() {
    const stroke = strokes.pop()
    if (!stroke) return
    cancelVisibilityCheck()
    undoneStrokes.push(stroke)
    if (strokes.length) scheduleVisibilityCheck()
    else updateHasDrawing(false)
    redraw()
  }

  function redo() {
    const stroke = undoneStrokes.pop()
    if (!stroke) return
    cancelVisibilityCheck()
    strokes.push(stroke)
    if (stroke.tool === 'pencil') updateHasDrawing(true)
    else if (hasDrawing) scheduleVisibilityCheck()
    redraw()
  }

  function save(entry, maxEntries) {
    cancelVisibilityCheck()
    entries.unshift(entry)
    entries.length = Math.min(entries.length, maxEntries)
    strokes = []
    undoneStrokes = []
    updateHasDrawing(false)
    redraw()
  }

  function update(delta) {
    if (openElapsed >= ZOOM_DURATION) return
    openElapsed = Math.min(openElapsed + delta, ZOOM_DURATION)
    openProgress = THREE.MathUtils.lerp(
      openStart,
      openTarget,
      easeInOut(openElapsed / ZOOM_DURATION),
    )
    coverPivot.rotation.z = Math.PI * openProgress
  }

  function dispose() {
    cancelVisibilityCheck()
    const materials = new Set()
    visitorBook.traverse((child) => {
      if (!child.isMesh) return

      child.geometry.dispose()
      const childMaterials = Array.isArray(child.material) ? child.material : [child.material]
      for (const material of childMaterials) materials.add(material)
    })
    for (const material of materials) {
      material.map?.dispose()
      material.dispose()
    }
  }

  visitorBook.meshes = getMeshes(visitorBook)
  visitorBook.drawingSurface = rightPage
  visitorBook.zoom = {
    target: visitorBook,
    offset: new THREE.Vector3(0, 105, 0),
    fitWidth: (PAGE_WIDTH + 3) * 2,
    up: new THREE.Vector3(0, 0, -1),
    onStart: () => setOpen(true),
  }
  visitorBook.controlAnchors = {
    toolbar: toolbarAnchor,
    pageNavigation: pageNavigationAnchor,
  }
  visitorBook.controls = {
    setOpen,
    setEntries,
    setPage,
    setTool,
    setDrawingListener,
    beginStroke,
    continueStroke,
    endStroke,
    getStrokes,
    clear,
    undo,
    redo,
    save,
  }
  visitorBook.update = update
  visitorBook.dispose = dispose

  return visitorBook
}
