import './styles.css'

function formatTitle(obj) {
  return obj.catalog ? `${obj.catalog} / ${obj.name}` : obj.name
}

const DIRECTIONS = [
  'north', 'northeast', 'east', 'southeast',
  'south', 'southwest', 'west', 'northwest',
]

function formatDirection(altDeg, azDeg) {
  const directionName = DIRECTIONS[Math.round(azDeg / 45) % 8]
  const direction = `${directionName.charAt(0).toUpperCase()}${directionName.slice(1)}`
  return `${direction}, ${Math.round(altDeg)}° above the horizon`
}

const UNITS = {
  ly: ['light-year', 'light-years'],
  au: ['astronomical unit', 'astronomical units'],
  km: ['kilometer', 'kilometers'],
}

const NUMBER_SCALES = [[1e12, 'trillion'], [1e9, 'billion'], [1e6, 'million']]

function roundToThreeSignificantDigits(value) {
  const factor = 10 ** (2 - Math.floor(Math.log10(Math.abs(value))))
  return Math.round(value * factor) / factor
}

function formatAmount(value) {
  const scale = NUMBER_SCALES.find(([size]) => value >= size)
  return scale
    ? `${roundToThreeSignificantDigits(value / scale[0])} ${scale[1]}`
    : `${roundToThreeSignificantDigits(value)}`
}

function formatQuantity(value, unit) {
  const [singular, plural] = UNITS[unit]
  return `${formatAmount(value)} ${roundToThreeSignificantDigits(value) === 1 ? singular : plural}`
}

const CONVERSIONS = {
  au: '1 astronomical unit = 150 million kilometers',
  ly: '1 light-year = 9.46 trillion kilometers',
}

const MAGNITUDE_GAUGE = 'Smaller = brighter, naked eye limit under dark skies = 6.5'

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

export default function CelestialPopup({ obj, placement, onClose }) {
  const rows = [
    obj.magnitude != null && ['Magnitude', String(obj.magnitude), MAGNITUDE_GAUGE],
    obj.distance && ['Distance', formatQuantity(obj.distance.value, obj.distance.unit), CONVERSIONS[obj.distance.unit]],
    obj.phase && ['Phase', formatPhase(obj.phase)],
    ['Look', formatDirection(obj.altDeg, obj.azDeg)],
  ].filter(Boolean)

  return (
    <div className='popup-overlay celestial-popup-overlay' onClick={onClose}>
      <div
        className={`popup celestial-popup popup-static ${placement.className}`}
        style={placement.style}
        onClick={(e) => e.stopPropagation()}
      >
        <span className='celestial-popup-flash' aria-hidden='true' />
        <button type='button' aria-label='Close celestial details' onClick={onClose} className='popup-close'>×</button>
        <header className='celestial-head'>
          <h2 className='celestial-name'>{formatTitle(obj)}</h2>
        </header>
        <dl className='celestial-fields'>
          {rows.map(([label, value, explainer]) => (
            <div className='celestial-field' key={label}>
              <dt>{explainer ? <span className='celestial-term'>{label}</span> : label}</dt>
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
