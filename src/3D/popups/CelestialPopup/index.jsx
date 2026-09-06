import { useState } from 'react'
import './styles.css'

const DIRECTIONS = [
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest',
]

const UNITS = {
  ly: ['light-year', 'light-years'],
  au: ['astronomical unit', 'astronomical units'],
  km: ['kilometer', 'kilometers'],
}

const NUMBER_SCALES = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]

function formatTitle(obj) {
  return obj.catalog ? `${obj.catalog} / ${obj.name}` : obj.name
}

function formatDirection(altDeg, azDeg) {
  const directionName = DIRECTIONS[Math.round(azDeg / 45) % 8]
  const direction = `${directionName.charAt(0).toUpperCase()}${directionName.slice(1)}`
  return `${direction}, ${Math.round(altDeg)}° above the horizon`
}

function round(value) {
  const factor = 10 ** (2 - Math.floor(Math.log10(Math.abs(value))))
  return Math.round(value * factor) / factor
}

function formatAmount(value) {
  const scale = NUMBER_SCALES.find(([size]) => value >= size)
  return scale ? `${round(value / scale[0])} ${scale[1]}` : `${round(value)}`
}

function formatQuantity(value, unit) {
  const [singular, plural] = UNITS[unit]
  return `${formatAmount(value)} ${round(value) === 1 ? singular : plural}`
}

const CONVERSIONS = {
  au: '1 astronomical unit = 150 million kilometers',
  ly: '1 light-year = 9.46 trillion kilometers',
}

const MAGNITUDE_INFO = 'Smaller = brighter, naked eye limit under dark skies = 6.5'

function phaseName({ illuminated, waxing }) {
  if (illuminated < 0.02) return 'New moon'
  if (illuminated > 0.98) return 'Full moon'
  if (Math.abs(illuminated - 0.5) < 0.06) return waxing ? 'First quarter' : 'Last quarter'
  const shape = illuminated < 0.5 ? 'crescent' : 'gibbous'
  return `${waxing ? 'Waxing' : 'Waning'} ${shape}`
}

function formatPhase(phase) {
  return `${phaseName(phase)}, ${Math.round(phase.illuminated * 100)}% lit`
}

function getPlacement(anchor) {
  const x = anchor.x * window.innerWidth
  const y = anchor.y * window.innerHeight
  const opensRight = x <= window.innerWidth / 2
  const opensDown = y <= window.innerHeight / 2

  return {
    className: `celestial-popup--from-${opensDown ? 'top' : 'bottom'}-${opensRight ? 'left' : 'right'}`,
    style: {
      [opensRight ? 'left' : 'right']: `calc(${opensRight ? x : window.innerWidth - x}px + 4.5em)`,
      [opensDown ? 'top' : 'bottom']: `calc(${opensDown ? y : window.innerHeight - y}px + 4.5em)`,
    },
  }
}

export default function CelestialPopup({ obj, anchor, onClose, onPointerInput }) {
  const [expandedField, setExpandedField] = useState(null)
  const [touch, setTouch] = useState(false)
  const placement = getPlacement(anchor)

  const rows = [
    obj.magnitude != null && ['Magnitude', String(obj.magnitude), MAGNITUDE_INFO],
    obj.distance && ['Distance', formatQuantity(obj.distance.value, obj.distance.unit), CONVERSIONS[obj.distance.unit]],
    obj.phase && ['Phase', formatPhase(obj.phase)],
    ['Look', formatDirection(obj.altDeg, obj.azDeg)],
  ].filter(Boolean)

  return (
    <div
      className='popup-overlay celestial-popup-overlay'
      onPointerDownCapture={(e) => onPointerInput(e.pointerType, e.clientX, e.clientY)}
      onClick={onClose}
    >
      <div
        className={`popup celestial-popup ${placement.className}${touch ? ' celestial-popup--touch' : ''}`}
        style={placement.style}
        onPointerDown={(e) => {
          if (e.pointerType !== 'mouse') setTouch(true)
        }}
        onPointerMove={(e) => {
          if (e.pointerType === 'mouse') setTouch(false)
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <span className='celestial-popup-flash' />
        <button type='button' onClick={onClose} className='popup-close'>×</button>
        <header className='celestial-head'>
          <h2 className='celestial-name'>{formatTitle(obj)}</h2>
        </header>
        <dl className='celestial-fields'>
          {rows.map(([label, value, explainer]) => (
            <div className={`celestial-field${expandedField === label ? ' celestial-field--expanded' : ''}`} key={label}>
              <dt>
                {explainer ? (
                  <span
                    className='celestial-term'
                    onPointerUp={(e) => {
                      if (e.pointerType === 'mouse') return
                      e.stopPropagation()
                      setExpandedField((current) => current === label ? null : label)
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {label}
                  </span>
                ) : label}
              </dt>
              <dd>
                {value}
                {explainer && <span className='celestial-explainer'>{explainer}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  )
}
