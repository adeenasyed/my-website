import * as THREE from 'three'

const LERP_SPEED = 0.12
const HOVER_COLOR = '#777777'

export function createInteractionManager(camera, renderer) {
  const interactables = []
  const allMeshes = []
  const meshToInteractable = new Map()
  const raycaster = new THREE.Raycaster()
  const pointerNdc = new THREE.Vector2()
  const projectedPosition = new THREE.Vector3()

  let enabled = false
  let nativeCursorHidden = false
  let hovered = null
  let fading = false
  let drawingSurface = null
  let drawingControls = null
  let drawingPointerId = null

  function add(meshes, hoverColor = HOVER_COLOR, onClick, { anchor = null } = {}) {
    const hoverEmissive = new THREE.Color(hoverColor)
    const emissives = [...new Set(meshes.flatMap(({ material }) => material))]
      .filter((material) => material?.emissive)
      .map(({ emissive }) => ({ emissive, original: emissive.clone() }))
    const obj = { hoverEmissive, emissives, onClick, anchor, enabled: true }
    interactables.push(obj)
    for (const m of meshes) {
      meshToInteractable.set(m, obj)
      allMeshes.push(m)
    }
    return obj
  }

  function addBlockers(root) {
    root.traverse((child) => {
      if (child.isMesh && !meshToInteractable.has(child)) allMeshes.push(child)
    })
  }

  function update() {
    if (!fading) return
    let allArrived = true
    for (const obj of interactables) {
      for (const { emissive, original } of obj.emissives) {
        const target = obj === hovered ? obj.hoverEmissive : original
        emissive.lerp(target, LERP_SPEED)
        if (Math.abs(emissive.r - target.r) + Math.abs(emissive.g - target.g) + Math.abs(emissive.b - target.b) > 0.004) {
          allArrived = false
        } else {
          emissive.copy(target)
        }
      }
    }
    if (allArrived) fading = false
  }

  function updateNativeCursor() {
    renderer.domElement.style.cursor = nativeCursorHidden
      ? 'none'
      : drawingSurface
        ? 'crosshair'
        : hovered ? 'pointer' : 'default'
  }

  function clearHovered() {
    hovered = null
    fading = true
    updateNativeCursor()
  }

  function setEnabled(nextEnabled, items) {
    if (items) {
      for (const item of items) item.enabled = nextEnabled
      if (!nextEnabled && items.includes(hovered)) clearHovered()
    } else {
      if (!nextEnabled && hovered) clearHovered()
      enabled = nextEnabled
    }
  }

  function setNativeCursorHidden(hidden) {
    nativeCursorHidden = hidden
    updateNativeCursor()
  }

  function setDrawingTarget(surface, controls) {
    drawingSurface = surface
    drawingControls = controls
    drawingPointerId = null
    if (hovered) clearHovered()
    else updateNativeCursor()
  }

  function isHovering() {
    return hovered !== null
  }

  function projectToScreen(anchor) {
    if (!anchor) return null
    anchor.getWorldPosition(projectedPosition).project(camera)
    const rect = renderer.domElement.getBoundingClientRect()
    return {
      x: rect.left + (projectedPosition.x + 1) * rect.width / 2,
      y: rect.top + (1 - projectedPosition.y) * rect.height / 2,
    }
  }

  function setPointerFromEvent(e) {
    pointerNdc.x = (e.clientX / window.innerWidth) * 2 - 1
    pointerNdc.y = -(e.clientY / window.innerHeight) * 2 + 1
    raycaster.setFromCamera(pointerNdc, camera)
  }

  function pick() {
    const hits = raycaster.intersectObjects(allMeshes, false)
    for (const hit of hits) {
      let object = hit.object
      let interactable = null

      while (object && object.visible) {
        if (!interactable) {
          interactable = meshToInteractable.get(object)
        }
        object = object.parent
      }
      if (object) continue
      if (interactable?.enabled === false) continue
      return interactable
    }
    return null
  }

  renderer.domElement.addEventListener('mousemove', (e) => {
    if (!enabled || drawingSurface) return
    setPointerFromEvent(e)

    const hit = pick()
    if (hit !== hovered) {
      hovered = hit
      fading = true
      updateNativeCursor()
    }
  })

  function getDrawingUv(e) {
    if (!drawingSurface) return null
    setPointerFromEvent(e)
    return raycaster.intersectObject(drawingSurface, false)[0]?.uv ?? null
  }

  function continueDrawing(e) {
    const events = e.getCoalescedEvents?.()
    for (const event of events?.length ? events : [e]) {
      const uv = getDrawingUv(event)
      if (uv) drawingControls.continueStroke(uv)
    }
  }

  function finishDrawing() {
    drawingPointerId = null
    drawingControls.endStroke()
  }

  function endDrawing(e) {
    if (e.pointerId !== drawingPointerId) return
    e.preventDefault()
    if (e.type === 'pointerup') continueDrawing(e)
    finishDrawing()
  }

  renderer.domElement.addEventListener('click', (e) => {
    if (!enabled || drawingSurface) return
    setPointerFromEvent(e)

    const hit = pick()
    if (!hit) return
    hovered = null
    fading = true
    updateNativeCursor()
    hit.onClick(projectToScreen(hit.anchor), { pointerType: e.pointerType, x: e.clientX, y: e.clientY })
  })

  renderer.domElement.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return
    const uv = getDrawingUv(e)
    if (!uv) return
    e.preventDefault()
    if (drawingPointerId !== null) finishDrawing()
    drawingPointerId = e.pointerId
    renderer.domElement.setPointerCapture(e.pointerId)
    drawingControls.beginStroke(uv)
  })

  renderer.domElement.addEventListener('pointermove', (e) => {
    if (e.pointerId !== drawingPointerId) return
    e.preventDefault()
    continueDrawing(e)
  })

  renderer.domElement.addEventListener('pointerup', endDrawing)

  renderer.domElement.addEventListener('pointercancel', endDrawing)

  renderer.domElement.addEventListener('lostpointercapture', endDrawing)

  return { add, addBlockers, update, setEnabled, setNativeCursorHidden, setDrawingTarget, isHovering, projectToScreen, pointerNdc }
}
