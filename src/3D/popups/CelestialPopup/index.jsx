import './styles.css'

const TYPE_LABEL = {
  sun: 'Star',
  star: 'Star',
  planet: 'Planet',
  moon: 'Moon',
  galaxy: 'Galaxy',
  nebula: 'Nebula',
  cluster: 'Star Cluster',
}

const DIRECTIONS = [
  'north', 'north-northeast', 'northeast', 'east-northeast',
  'east', 'east-southeast', 'southeast', 'south-southeast',
  'south', 'south-southwest', 'southwest', 'west-southwest',
  'west', 'west-northwest', 'northwest', 'north-northwest',
]

function whereToLook(altDeg, azDeg) {
  const compass = DIRECTIONS[Math.round(azDeg / 22.5) % 16]
  const height = altDeg >= 80
    ? 'almost directly overhead'
    : altDeg >= 60 ? `high in the sky (${Math.round(altDeg)}° up)`
    : altDeg <= 12 ? `just above the horizon (${Math.round(altDeg)}° up)`
    : `${Math.round(altDeg)}° above the horizon`
  return { compass, height }
}

export default function CelestialPopup({ obj, onClose }) {
  const stats = [
    ['Constellation', obj.constellation],
    ['Catalog', obj.catalog],
    ['Magnitude', obj.magnitude != null ? String(obj.magnitude) : null],
    ['Distance', obj.distanceText],
    ['Spectral Type', obj.spectralType],
  ].filter(([, value]) => value)

  const look = whereToLook(obj.altDeg, obj.azDeg)

  return (
    <div className='popup-overlay' onClick={onClose}>
      <div className='popup celestial-popup popup-static' onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className='popup-close'>×</button>
        <div className='celestial-name'>{obj.name}</div>
        <div className='celestial-badge'>{TYPE_LABEL[obj.type]}</div>
        <div className='attributions-divider' />
        <ul className='celestial-stats'>
          {stats.map(([label, value]) => (
            <li key={label}>
              <span className='celestial-stat-label'>{label}</span>
              <span className='celestial-stat-value'>{value}</span>
            </li>
          ))}
        </ul>
        <p className='celestial-blurb'>{obj.blurb}</p>
        <div className='celestial-look'>
          <span className='celestial-look-label'>WHERE TO LOOK</span>
          <span className='celestial-look-text'>
            Face <strong>{look.compass}</strong> and look {look.height}.
          </span>
          <span className='celestial-look-note'>from my spot in Toronto, right now</span>
        </div>
      </div>
    </div>
  )
}
