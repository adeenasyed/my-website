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
  let currentHovered = null
  let fading = false

  function add(meshes, hoverColor = HOVER_COLOR, onClick, { anchor = null } = {}) {
    const hoverEmissive = new THREE.Color(hoverColor)
    const originalEmissives = meshes.map((m) => m.material?.emissive?.clone() ?? new THREE.Color(0))
    const obj = { meshes, hoverEmissive, originalEmissives, onClick, anchor, hovered: false, enabled: true }
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
      for (const [i, m] of obj.meshes.entries()) {
        const emissive = m.material?.emissive
        if (!emissive) continue
        const target = obj.hovered ? obj.hoverEmissive : obj.originalEmissives[i]
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

  function updateNativeCursor(isHovering) {
    renderer.domElement.style.cursor = nativeCursorHidden ? 'none' : isHovering ? 'pointer' : 'default'
  }

  function clearCurrentHover() {
    currentHovered.hovered = false
    currentHovered = null
    fading = true
    updateNativeCursor(false)
  }

  function setEnabled(nextEnabled, items) {
    if (items) {
      for (const item of items) item.enabled = nextEnabled
      if (!nextEnabled && items.includes(currentHovered)) clearCurrentHover()
    } else {
      if (!nextEnabled && currentHovered) clearCurrentHover()
      enabled = nextEnabled
    }
  }

  function setNativeCursorHidden(hidden) {
    nativeCursorHidden = hidden
    updateNativeCursor(Boolean(currentHovered))
  }

  function isHoveringAnchor() {
    return Boolean(currentHovered?.anchor)
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
    const hits = raycaster.intersectObjects(allMeshes, true)
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
    if (!enabled) return
    setPointerFromEvent(e)

    const hit = pick()
    if (hit !== currentHovered) {
      if (currentHovered) currentHovered.hovered = false
      if (hit) hit.hovered = true
      fading = true
      updateNativeCursor(Boolean(hit))
      currentHovered = hit
    }
  })

  renderer.domElement.addEventListener('click', (e) => {
    if (!enabled) return
    setPointerFromEvent(e)

    const hit = pick()
    if (!hit) return
    hit.hovered = false
    fading = true
    if (currentHovered === hit) {
      currentHovered = null
      updateNativeCursor(false)
    }
    hit.onClick(projectToScreen(hit.anchor), { pointerType: e.pointerType, x: e.clientX, y: e.clientY })
  })

  return { add, addBlockers, update, setEnabled, setNativeCursorHidden, isHoveringAnchor, projectToScreen, pointerNdc }
}
