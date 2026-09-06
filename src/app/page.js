'use client'
import '@/3D/popups/styles.css'
import { useEffect, useRef, useState } from 'react'
import { createScene } from '@/3D/scene.js'
import { PURPLE } from '@/theme.js'
import ContactPopup from '@/3D/popups/ContactPopup'
import AttributionsPopup from '@/3D/popups/AttributionsPopup'
import RemotePopup from '@/3D/popups/RemotePopup'
import CelestialPopup from '@/3D/popups/CelestialPopup'
import Cursor from '@/3D/sky/Cursor'
import Compass from '@/3D/sky/Compass'

const VIEW_OPTIONS = [
  { label: 'ROOM VIEW', room: true },
  { label: 'SKY VIEW', room: false },
]

const START_GLITCH_MS = 560
const START_HOLD_MS = 130

function getDevice(width) {
  if (width < 768) return 'mobile'
  if (width < 1024) return 'tablet-portrait'
  return window.matchMedia('(pointer: coarse)').matches ? 'tablet' : 'desktop'
}

function supports3D(device) {
  return device === 'desktop' || device === 'tablet'
}

function ViewOption({ selected, label, ...props }) {
  return (
    <button
      className='view-switch-option'
      type='button'
      aria-pressed={selected}
      {...props}
    >
      <span className='view-switch-box'>[{selected ? '■' : '\u00A0'}]</span>
      {label}
    </button>
  )
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
  const modeRef = useRef(null)
  const startTimeoutRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [starting, setStarting] = useState(false)
  const [showRemote, setShowRemote] = useState(false)
  const [ledColor, setLEDColor] = useState(PURPLE)
  const [tvSource, setTVSource] = useState('spotify')
  const [showContact, setShowContact] = useState(false)
  const [showAttributions, setShowAttributions] = useState(false)
  const [activeCelestial, setActiveCelestial] = useState(null)
  const [mouseInput, setMouseInput] = useState(false)
  const [device, setDevice] = useState('desktop')
  const [loading, setLoading] = useState(0)
  const [introComplete, setIntroComplete] = useState(false)
  const [roomZoomed, setRoomZoomed] = useState(false)
  const [roomVisible, setRoomVisible] = useState(true)
  const [showConstellations, setShowConstellations] = useState(true)
  const [clock, setClock] = useState({ date: '', time: '' })

  const showSkyOverlay = mode === '3D' && supports3D(device) && introComplete && !roomZoomed

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

  function handleStart() {
    if (modeRef.current !== null || !worldRef.current) return
    modeRef.current = '3D'
    setStarting(true)
    startTimeoutRef.current = setTimeout(() => {
      setMode('3D')
      sceneRef.current?.cancelLandingLoop()
      worldRef.current?.startIntro()
    }, START_GLITCH_MS + START_HOLD_MS)
  }

  function syncInteractions(currentDevice = getDevice(window.innerWidth)) {
    const interactionState = interactionStateRef.current
    const enabled = modeRef.current === '3D'
      && supports3D(currentDevice)
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

  function handleEscape() {
    closeRemote()
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

  function selectView(showRoom) {
    if (showRoom === roomVisible) return
    setRoomVisible(showRoom)
    worldRef.current?.setRoomVisible(showRoom)
    sceneRef.current?.sky.setConstellationsVisible(!showRoom && showConstellations)
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
    let currentDevice = getDevice(window.innerWidth)
    setDevice(currentDevice)
    mouseInputRef.current = currentDevice === 'desktop'
    setMouseInput(mouseInputRef.current)

    function onResize() {
      currentDevice = getDevice(window.innerWidth)
      setDevice(currentDevice)
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
      syncInteractions(currentDevice)
    }
    window.addEventListener('resize', onResize)

    function onKeyDown(e) {
      if (e.key === 'Escape' && celestialAnchorRef.current) {
        e.preventDefault()
        closeCelestial()
        return
      }
      if (e.code !== 'Space' && e.code !== 'Enter') return
      if (modeRef.current !== null || !supports3D(currentDevice)) return
      e.preventDefault()
      handleStart()
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

    if (currentDevice === 'mobile') {
      setLoading(null)
    } else {
      async function loadWorld() {
        const { createWorld } = await import('@/3D/index.js')
        const world = await createWorld({
          ...context,
          onProgress: setLoading,
          tv: openRemote,
          lightSign: () => setShowContact(true),
          infoButton: () => setShowAttributions(true),
          remote: openRemote,
          onIntroComplete: handleIntroComplete,
          onCelestialClick: openCelestial,
          onPointerDirectionChange: updateReadout,
          onZoomChange: handleZoomChange,
          onEscape: handleEscape,
        })
        if (!sceneRef.current) {
          world.dispose()
          return
        }
        worldRef.current = world
        setLoading(null)
      }
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
      clearTimeout(startTimeoutRef.current)
      context.cancelLandingLoop()
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
    const active = mode === '3D' && supports3D(device) && mouseInput && !roomVisible && !activeCelestial
    cursorStateRef.current.active = active
    worldRef.current?.setNativeCursorHidden(active)
    drawCursor()
  }, [mode, device, mouseInput, roomVisible, activeCelestial])

  useEffect(() => {
    if (showSkyOverlay) return
    cursorStateRef.current.overSwitch = false
    drawCursor()
  }, [showSkyOverlay])

  return (
    <>
      {loading !== null && (
        <div className='loading-screen'>
          <div className='loading-bar' style={{ width: `${Math.round(loading * 100)}%` }} />
        </div>
      )}

      {mode === null && loading === null && (
        <div className='landing'>
          {supports3D(device) ? (
            <button
              className={`landing-prompt landing-start-button${starting ? ' landing-start-button--exiting' : ''}`}
              type='button'
              onClick={handleStart}
            >
              <span className='landing-start-symbol'>▶</span> START
              {starting && (
                <>
                  <span className='landing-start-ghost landing-start-ghost--red'>▶ START</span>
                  <span className='landing-start-ghost landing-start-ghost--blue'>▶ START</span>
                </>
              )}
            </button>
          ) : (
            <div className='landing-prompt'>GET A BIGGER SCREEN</div>
          )}
        </div>
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
      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}
      {showAttributions && <AttributionsPopup onClose={() => setShowAttributions(false)} />}
      {activeCelestial && (
        <CelestialPopup
          obj={activeCelestial.obj}
          anchor={activeCelestial.anchor}
          onClose={closeCelestial}
          onPointerInput={updatePointerInput}
        />
      )}
      {mode === '3D' && supports3D(device) && (mouseInput || activeCelestial) && <Cursor ref={cursorRef} />}
      {mode === '3D' && <Compass ref={compassRef} />}
      {showSkyOverlay && (
        <div className='sky-overlay'>
          <div className='sky-caption'>THE SKY ABOVE <br /> TORONTO, ON <br /> {clock.date} <br /> {clock.time}</div>
          <div className='view-switch' role='group' {...switchHoverHandlers}>
            {VIEW_OPTIONS.map(({ label, room }) => (
              <ViewOption
                key={label}
                selected={roomVisible === room}
                label={label}
                disabled={showRemote}
                onClick={() => selectView(room)}
              />
            ))}
          </div>

          {!roomVisible && (
            <div className='view-switch' role='group' {...switchHoverHandlers}>
              <ViewOption
                selected={showConstellations}
                label='CONSTELLATIONS'
                disabled={showRemote}
                onClick={toggleConstellations}
              />
            </div>
          )}
        </div>
      )}
      {mode === '3D' && !supports3D(device) && (
        <div className='orientation-warning'>
          <span className='landing-prompt'>GET A BIGGER SCREEN</span>
        </div>
      )}
    </>
  )
}
