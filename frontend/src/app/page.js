'use client'
import { useEffect, useRef, useState } from 'react'
import { buildRoom } from '@/room/index.js'
import { PURPLE, LED_COLORS } from '@/theme.js'
import { ATTRIBUTIONS } from './attributions.js'

const SCREENS = ['LISTENING ACTIVITY', 'ALBUM OF THE MONTH']

export default function Home() {
  const roomRef = useRef(null)
  const [showRemote, setShowRemote] = useState(false)
  const [ledColor, setLedColor] = useState(PURPLE)
  const [tvZoom, setTVZoom] = useState(false)
  const [laptopZoom, setLaptopZoom] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [showAttributions, setShowAttributions] = useState(false)

  useEffect(() => {
    let disposed = false
    buildRoom({
      onRemoteClick: () => openRemote(),
      onTVClick: () =>
        roomRef.current?.zoomOnTV(() => {
          setTVZoom(true)
          openRemote()
        }),
      onLaptopClick: () => roomRef.current?.zoomOnLaptop(() => setLaptopZoom(true)),
      onLightSignClick: () => setShowContact(true),
      onInfoClick: () => setShowAttributions(true),
      onEscape: () => handleEscape(),
    }).then((actions) => {
      if (disposed) {
        actions.dispose()
        return
      }
      roomRef.current = actions
    })
    return () => {
      disposed = true
      roomRef.current?.dispose()
      roomRef.current = null
    }
  }, [])

  function openRemote() {
    setShowRemote(true)
    roomRef.current?.setInteractionsEnabled(false)
  }

  function closeRemote() {
    setShowRemote(false)
    roomRef.current?.setInteractionsEnabled(true)
  }

  function handleEscape() {
    setTVZoom(false)
    setLaptopZoom(false)
    closeRemote()
    roomRef.current?.resetCamera()
  }

  return (
    <>
      <div className="mobile-overlay">
        <p>
          MOBILE OVERLAY
        </p>
      </div>

      {showRemote && (
        <div className="remote-anchor" onClick={(e) => e.stopPropagation()}>
          <div className="popup remote-popup" style={{ '--accent': ledColor, '--accent-shadow': `${ledColor}44` }}>
            <button onClick={tvZoom ? handleEscape : closeRemote} className="popup-close">×</button>
            <div className="popup-label" style={{ marginBottom: 4 }}>SELECT</div>
            {SCREENS.map((label, i) => (
              <button key={i} onClick={() => roomRef.current?.setTVMode(i)} className="popup-button">
                {label}
              </button>
            ))}
            {!tvZoom && (
              <div className="remote-led-section" style={{ borderTop: `1px solid ${ledColor}33` }}>
                <div className="popup-label" style={{ marginBottom: 8 }}>LEDS</div>
                <div className="color-swatch-row">
                  {LED_COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => { roomRef.current?.setLEDColor(color); setLedColor(color) }}
                      className="color-swatch"
                      style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {laptopZoom && (
        <div className="laptop-zoom-anchor" onClick={(e) => e.stopPropagation()} />
      )}

      {showContact && (
        <div className="popup-overlay" onClick={(e) => e.stopPropagation()}>
          <div className="popup popup-static">
            <button onClick={() => setShowContact(false)} className="popup-close">×</button>
            <a href="mailto:adeenasyed@icloud.com" className="popup-link">adeenasyed@icloud.com</a>
            <a href="https://linkedin.com/in/adeena-syed" target="_blank" className="popup-link">linkedin.com/in/adeena-syed</a>
          </div>
        </div>
      )}

      {showAttributions && (
        <div className="popup-overlay">
          <div className="popup attributions-popup popup-static" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowAttributions(false)} className="popup-close">×</button>
            <div className="attributions-title">ATTRIBUTIONS</div>
            <div className="attributions-divider" />
            <ul className="attributions-list">
              {ATTRIBUTIONS.map((a) => (
                <li key={a.name}>
                  <span className="attributions-bullet">•</span>
                  <span className="attributions-item">
                    {a.nameUrl ? (
                      <a href={a.nameUrl} target="_blank" className="attributions-item-link">{a.name}</a>
                    ) : (
                      <span className="attributions-item-link">{a.name}</span>
                    )}
                    {a.author && (
                      <>
                        <span className="attributions-muted"> by </span>
                        <a href={a.authorUrl} target="_blank" className="attributions-item-link">{a.author}</a>
                      </>
                    )}
                    <span className="attributions-muted"> via {a.via}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </>
  )
}
