'use client'
import '@/3D/popups/styles.css'
import { useEffect, useRef, useState } from 'react'
import { createScene } from '@/3D/scene.js'
import { PURPLE } from '@/theme.js'
import ContactPopup from '@/3D/popups/ContactPopup'
import AttributionsPopup from '@/3D/popups/AttributionsPopup'
import RemotePopup from '@/3D/popups/RemotePopup'
import CelestialPopup from '@/3D/popups/CelestialPopup'

function getDevice(w) {
  if (w >= 1024) return 'ok'
  if (w >= 768) return 'tablet'
  return 'mobile'
}

export default function Landing() {
  const sceneRef = useRef(null)
  const roomRef = useRef(null)
  const modeRef = useRef(null)
  const [mode, setMode] = useState(null)
  const [showRemote, setShowRemote] = useState(false)
  const [ledColor, setLEDColor] = useState(PURPLE)
  const [showContact, setShowContact] = useState(false)
  const [showAttributions, setShowAttributions] = useState(false)
  const [activeCelestial, setActiveCelestial] = useState(null)
  const [device, setDevice] = useState('ok')
  const [loading, setLoading] = useState(0)
  const [introComplete, setIntroComplete] = useState(false)
  const [roomZoomed, setRoomZoomed] = useState(false)
  const [roomVisible, setRoomVisible] = useState(true)
  const [clock, setClock] = useState('')

  useEffect(() => {
    let currentDevice = getDevice(window.innerWidth)
    setDevice(currentDevice)

    function onResize() {
      currentDevice = getDevice(window.innerWidth)
      setDevice(currentDevice)
      if (modeRef.current === '3D') {
        roomRef.current?.setInteractionsEnabled(currentDevice === 'ok')
      }
    }
    window.addEventListener('resize', onResize)

    const context = createScene()
    sceneRef.current = context

    if (currentDevice === 'mobile') {
      setLoading(null)
    } else {
      async function loadRoom() {
        const { buildRoom } = await import('@/3D/index.js')
        const room = await buildRoom({
          ...context,
          setProgress: setLoading,
          tv: openRemote,
          lightSign: () => setShowContact(true),
          infoButton: () => setShowAttributions(true),
          remote: openRemote,
          onIntroComplete: () => setIntroComplete(true),
          onCelestialClick: setActiveCelestial,
          onZoomChange: setRoomZoomed,
          onEscape: handleEscape,
        })
        if (!sceneRef.current) {
          room.dispose()
          return
        }
        roomRef.current = room
        setLoading(null)
      }
      loadRoom()
    }

    return () => {
      window.removeEventListener('resize', onResize)
      context.cancelLandingLoop()
      roomRef.current?.dispose()
      context.dispose()
      sceneRef.current = null
      roomRef.current = null
    }
  }, [])

  useEffect(() => {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    })
    const tick = () => setClock(fmt.format(new Date()))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  function handleChoose3D() {
    if (modeRef.current !== null || !roomRef.current) return
    modeRef.current = '3D'
    setMode('3D')
    sceneRef.current.cancelLandingLoop()
    roomRef.current.startIntro()
  }

  function openRemote() {
    setShowRemote(true)
    roomRef.current.setInteractionsEnabled(false)
  }

  function closeRemote() {
    setShowRemote(false)
    roomRef.current.setInteractionsEnabled(getDevice(window.innerWidth) === 'ok')
  }

  function handleEscape() {
    closeRemote()
    roomRef.current.resetCamera()
  }

  function toggleRoom() {
    const visible = !roomVisible
    setRoomVisible(visible)
    roomRef.current?.setVisible(visible)
    roomRef.current?.setInteractionsEnabled(device === 'ok')
  }

  return (
    <>
      {loading !== null && (
        <div className='loading-screen'>
          <div className='loading-bar' style={{ width: `${Math.round(loading * 100)}%` }} />
        </div>
      )}

      {mode === null && loading === null && (
        <div className='landing'>
          <button className='landing-button landing-button--disabled'>
            <span className='landing-button-mode'>2D</span>
            <span className='landing-button-note'>COMING SOON</span>
          </button>
          <button
            className={`landing-button ${{ ok: 'landing-button--active', tablet: 'landing-button--rotate', mobile: 'landing-button--disabled' }[device]}`}
            onClick={device === 'ok' ? handleChoose3D : undefined}
          >
            <span className='landing-button-mode'>3D</span>
            {device === 'mobile' && <span className='landing-button-note'>UNAVAILABLE ON MOBILE <br /> GET A BIGGER SCREEN!</span>}
            {device === 'tablet' && <span className='landing-button-note landing-button-note--flash'>ROTATE DEVICE</span>}
          </button>
        </div>
      )}

      {showRemote && (
        <RemotePopup
          ledColor={ledColor}
          tvZoom={roomZoomed}
          onClose={closeRemote}
          onEscape={handleEscape}
          setTVMode={(i) => roomRef.current?.setTVMode(i)}
          setLEDColor={(color) => {
            roomRef.current?.setLEDColor(color)
            setLEDColor(color)
          }}
        />
      )}
      {showContact && <ContactPopup onClose={() => setShowContact(false)} />}
      {showAttributions && <AttributionsPopup onClose={() => setShowAttributions(false)} />}
      {activeCelestial && <CelestialPopup obj={activeCelestial} onClose={() => setActiveCelestial(null)} />}
      {mode === '3D' && device === 'ok' && introComplete && !roomZoomed && (
        <div className='sky-overlay'>
          <div className='sky-caption'>THE SKY ABOVE <br /> TORONTO, ON <br /> {clock}</div>
          <button
            className='room-toggle'
            type='button'
            aria-pressed={!roomVisible}
            disabled={showRemote}
            onClick={toggleRoom}
          >
            {roomVisible ? 'HIDE ROOM' : 'SHOW ROOM'}
          </button>
        </div>
      )}
      {mode === '3D' && device !== 'ok' && <div className='orientation-warning'>↺</div>}
    </>
  )
}
