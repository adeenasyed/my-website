'use client'
import '@/3D/styles.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createScene } from '@/3D/scene.js'
import { PURPLE } from '@/theme.js'
import AttributionsPopup from '@/3D/room/overlays/AttributionsPopup'
import RemotePopup from '@/3D/room/overlays/RemotePopup'
import VisitorBookControls from '@/3D/room/overlays/VisitorBookControls'
import CelestialPopup from '@/3D/sky/overlays/CelestialPopup'
import Cursor from '@/3D/sky/overlays/Cursor'
import Compass from '@/3D/sky/overlays/Compass'
import LandingView from './LandingView'
import Navbar from './Navbar'

function getDevice(width) {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet-portrait'
  return window.matchMedia('(pointer: coarse)').matches ? 'tablet' : 'desktop'
}

function supports3D(device) {
  return device === 'desktop' || device === 'tablet'
}

export default function Landing() {
  const sceneRef = useRef(null)
  const worldRef = useRef(null)
  const cursorRef = useRef(null)
  const compassRef = useRef(null)
  const celestialAnchorRef = useRef(null)
  const mouseInputRef = useRef(false)
  const interactionStateRef = useRef({
    introComplete: false,
    remoteOpen: false,
    zoomed: false,
  })
  const cursorStateRef = useRef({
    x: 0,
    y: 0,
    lockedX: 0,
    lockedY: 0,
    hovered: false,
    active: false,
    frozen: false,
    inside: true,
    pressed: false,
    overSwitch: false,
  })
  const activeViewRef = useRef('landing')
  const [activeView, setActiveView] = useState('landing')
  const [showRemote, setShowRemote] = useState(false)
  const [showVisitorBook, setShowVisitorBook] = useState(false)
  const [ledColor, setLEDColor] = useState(PURPLE)
  const [tvSource, setTVSource] = useState('spotify')
  const [showAttributions, setShowAttributions] = useState(false)
  const [activeCelestial, setActiveCelestial] = useState(null)
  const [mouseInput, setMouseInput] = useState(false)
  const [device, setDevice] = useState(null)
  const [worldReady, setWorldReady] = useState(false)
  const [introComplete, setIntroComplete] = useState(false)
  const [roomZoomed, setRoomZoomed] = useState(false)
  const [showConstellations, setShowConstellations] = useState(true)
  const [clock, setClock] = useState({ date: '', time: '' })

  const canEnter = supports3D(device)
  const showNavbar = worldReady && introComplete && !roomZoomed

  function drawCursor() {
    const el = cursorRef.current
    if (!el) return
    const cursor = cursorStateRef.current
    el.classList.toggle('sky-cursor--frozen', cursor.frozen)
    el.classList.toggle('sky-cursor--pressed', cursor.pressed)
    el.classList.toggle('sky-cursor--hover', cursor.hovered)
    const x = cursor.frozen ? cursor.lockedX : cursor.x
    const y = cursor.frozen ? cursor.lockedY : cursor.y
    el.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`
    if (cursor.frozen) {
      el.style.opacity = '1'
      return
    }
    el.style.opacity = cursor.active && cursor.inside && !cursor.overSwitch ? '1' : '0'
  }

  function updatePointerInput(pointerType, x, y) {
    if (!pointerType) return
    const usingMouse = pointerType === 'mouse'
    if (usingMouse !== mouseInputRef.current) {
      mouseInputRef.current = usingMouse
      setMouseInput(usingMouse)
    }
    const cursor = cursorStateRef.current
    if (usingMouse) {
      if (Number.isFinite(x)) cursor.x = x
      if (Number.isFinite(y)) cursor.y = y
    } else {
      cursor.active = false
    }
    drawCursor()
  }

  function updateReadout(state) {
    const cursor = cursorStateRef.current
    if (cursor.frozen) return
    cursor.hovered = state?.hovered ?? false
    compassRef.current?.setDirection(state ?? null)
    drawCursor()
  }

  function syncInteractions() {
    const interactionState = interactionStateRef.current
    const enabled = activeViewRef.current !== 'landing'
      && interactionState.introComplete
      && !interactionState.remoteOpen
      && !interactionState.zoomed
    worldRef.current?.setInteractionsEnabled(enabled)
  }

  function handleIntroComplete() {
    interactionStateRef.current.introComplete = true
    setIntroComplete(true)
    syncInteractions()
  }

  function beginIntro() {
    const world = worldRef.current
    if (!world || interactionStateRef.current.introComplete) return
    world.startIntro()
  }

  function handleZoomChange(zoomed) {
    interactionStateRef.current.zoomed = zoomed
    setRoomZoomed(zoomed)
    syncInteractions()
  }

  function openRemote() {
    interactionStateRef.current.remoteOpen = true
    setShowRemote(true)
    syncInteractions()
  }

  function closeRemote() {
    interactionStateRef.current.remoteOpen = false
    setShowRemote(false)
    syncInteractions()
  }

  function openVisitorBook() {
    setShowVisitorBook(true)
  }

  const closeVisitorBook = useCallback(() => {
    worldRef.current?.visitorBookControls.setOpen(false)
    setShowVisitorBook(false)
  }, [])

  function handleEscape() {
    closeRemote()
    closeVisitorBook()
    worldRef.current.resetCamera()
  }

  function updateTVSource(source) {
    worldRef.current?.setTVSource(source)
    setTVSource(source)
  }

  function updateLEDColor(color) {
    worldRef.current?.setLEDColor(color)
    setLEDColor(color)
  }

  function openCelestial(obj, screenPoint, getScreenPoint, pointer) {
    updatePointerInput(pointer?.pointerType, pointer?.x, pointer?.y)
    const cursor = cursorStateRef.current
    const { x, y } = screenPoint ?? cursor
    cursor.lockedX = x
    cursor.lockedY = y
    cursor.frozen = true
    cursor.hovered = false
    compassRef.current?.setDirection({ altDeg: obj.altDeg, azDeg: obj.azDeg })
    drawCursor()

    const anchor = {
      x: x / window.innerWidth,
      y: y / window.innerHeight,
    }
    celestialAnchorRef.current = { ...anchor, getScreenPoint }

    setActiveCelestial({
      obj,
      anchor,
    })
  }

  function closeCelestial() {
    cursorStateRef.current.frozen = false
    celestialAnchorRef.current = null
    setActiveCelestial(null)
    worldRef.current?.enableCameraControls()
  }

  function selectView(view) {
    if (view === activeViewRef.current) return
    const shouldStartIntro = view === 'room' && !interactionStateRef.current.introComplete
    if (view !== 'sky' && celestialAnchorRef.current) closeCelestial()
    activeViewRef.current = view
    setActiveView(view)
    worldRef.current?.setView(view)
    sceneRef.current?.sky.setConstellationsVisible(view === 'sky' && showConstellations)
    if (shouldStartIntro) beginIntro()
    syncInteractions()
  }

  function toggleConstellations() {
    const next = !showConstellations
    setShowConstellations(next)
    sceneRef.current?.sky.setConstellationsVisible(next)
  }

  const switchHoverHandlers = {
    onMouseEnter: () => {
      cursorStateRef.current.overSwitch = true
      drawCursor()
    },
    onMouseLeave: () => {
      cursorStateRef.current.overSwitch = false
      drawCursor()
    },
  }

  useEffect(() => {
    const initialDevice = getDevice(window.innerWidth)
    setDevice(initialDevice)
    mouseInputRef.current = initialDevice === 'desktop'
    setMouseInput(mouseInputRef.current)

    function onResize() {
      const nextDevice = getDevice(window.innerWidth)
      setDevice(nextDevice)

      if (supports3D(nextDevice)) loadWorld()

      const anchor = celestialAnchorRef.current
      if (anchor) {
        const screenPoint = anchor.getScreenPoint?.()
        const cursor = cursorStateRef.current
        cursor.lockedX = screenPoint?.x ?? anchor.x * window.innerWidth
        cursor.lockedY = screenPoint?.y ?? anchor.y * window.innerHeight
        drawCursor()
        const nextAnchor = {
          x: cursor.lockedX / window.innerWidth,
          y: cursor.lockedY / window.innerHeight,
        }
        celestialAnchorRef.current = { ...nextAnchor, getScreenPoint: anchor.getScreenPoint }
        setActiveCelestial((current) => current ? { ...current, anchor: nextAnchor } : current)
      }
      syncInteractions()
    }
    window.addEventListener('resize', onResize)

    function onKeyDown(e) {
      if (e.key === 'Escape' && celestialAnchorRef.current) {
        e.preventDefault()
        closeCelestial()
      }
    }
    window.addEventListener('keydown', onKeyDown)

    function onPointerMove(e) {
      updatePointerInput(e.pointerType, e.clientX, e.clientY)
    }
    function onMouseOut(e) {
      cursorStateRef.current.inside = Boolean(e.relatedTarget)
      drawCursor()
    }
    function onMouseOver() {
      cursorStateRef.current.inside = true
      drawCursor()
    }
    function onMouseDown() {
      cursorStateRef.current.pressed = true
      drawCursor()
    }
    function onMouseUp() {
      cursorStateRef.current.pressed = false
      drawCursor()
    }
    window.addEventListener('pointermove', onPointerMove)
    document.addEventListener('mouseout', onMouseOut)
    document.addEventListener('mouseover', onMouseOver)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('blur', onMouseUp)

    const context = createScene()
    sceneRef.current = context
    let worldLoading = false

    async function loadWorld() {
      if (worldLoading || worldRef.current) return
      worldLoading = true
      try {
        const { createWorld } = await import('@/3D/index.js')
        const world = await createWorld({
          ...context,
          onProgress: () => {},
          tv: openRemote,
          lightSign: () => selectView('landing'),
          infoButton: () => setShowAttributions(true),
          remote: openRemote,
          visitorBook: openVisitorBook,
          onIntroComplete: handleIntroComplete,
          onCelestialClick: openCelestial,
          onPointerDirectionChange: updateReadout,
          onZoomChange: handleZoomChange,
          onEscape: handleEscape,
        })
        if (sceneRef.current !== context) {
          world.dispose()
          return
        }
        worldRef.current = world
        context.setUpdate(world.update)
        setWorldReady(true)
      } catch (error) {
        console.error('world load:', error)
      } finally {
        worldLoading = false
      }
    }

    if (supports3D(initialDevice)) {
      loadWorld()
    }

    return () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('mouseout', onMouseOut)
      document.removeEventListener('mouseover', onMouseOver)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('blur', onMouseUp)
      worldRef.current?.dispose()
      context.dispose()
      sceneRef.current = null
      worldRef.current = null
    }
  }, [])

  useEffect(() => {
    const dateFormat = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
    const timeFormat = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    const tick = () => {
      const now = new Date()
      setClock({
        date: dateFormat.format(now).replaceAll(',', '').toUpperCase(),
        time: timeFormat.format(now),
      })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const active = activeView === 'sky'
      && mouseInput
      && !activeCelestial
      && !showVisitorBook
    cursorStateRef.current.active = active
    if (!showVisitorBook) worldRef.current?.setNativeCursorHidden(active)
    drawCursor()
  }, [activeView, mouseInput, activeCelestial, showVisitorBook])

  useEffect(() => {
    if (showNavbar) return
    cursorStateRef.current.overSwitch = false
    drawCursor()
  }, [showNavbar])

  return (
    <>
      {activeView === 'landing' && device !== null && (
        <LandingView
          key={canEnter ? 'enter' : 'no-enter'}
          canEnter={canEnter}
          entryEnabled={canEnter && worldReady && !introComplete}
          showIntro={!introComplete}
          onLaunch={beginIntro}
          onEnter={() => selectView('room')}
        />
      )}

      {showRemote && (
        <RemotePopup
          ledColor={ledColor}
          tvZoom={roomZoomed}
          tvSource={tvSource}
          onClose={closeRemote}
          onEscape={handleEscape}
          setTVSource={updateTVSource}
          setLEDColor={updateLEDColor}
        />
      )}
      {showVisitorBook && (
        <VisitorBookControls
          controls={worldRef.current.visitorBookControls}
          initialPointer={mouseInputRef.current ? cursorStateRef.current : null}
          onClose={closeVisitorBook}
          setNativeCursorHidden={worldRef.current.setNativeCursorHidden}
        />
      )}
      {showAttributions && <AttributionsPopup onClose={() => setShowAttributions(false)} />}
      {activeCelestial && (
        <CelestialPopup
          obj={activeCelestial.obj}
          anchor={activeCelestial.anchor}
          onClose={closeCelestial}
          onPointerInput={updatePointerInput}
        />
      )}
      {activeView !== 'landing' && (mouseInput || activeCelestial) && <Cursor ref={cursorRef} />}
      {activeView !== 'landing' && <Compass ref={compassRef} />}
      {showNavbar && (
        <Navbar
          activeView={activeView}
          clock={clock}
          disabled={showRemote}
          showConstellations={showConstellations}
          onSelectView={selectView}
          onToggleConstellations={toggleConstellations}
          {...switchHoverHandlers}
        />
      )}
    </>
  )
}
