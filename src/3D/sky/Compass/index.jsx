import { useImperativeHandle, useState } from 'react'
import './styles.css'

const DEG = Math.PI / 180
const BALL_RADIUS = 30
const BALL_CENTER = 36
const ARC_STEP = 4
const FACE_MARKS = [
  ...['N', 'E', 'S', 'W'].map((label, index) => ({ label, azimuth: index * 90, altitude: 0 })),
  { label: '·', azimuth: 0, altitude: 90 },
]

function formatAltitude(altitude) {
  const degrees = Math.round(altitude)
  const sign = degrees < 0 ? '−' : degrees > 0 ? '+' : ''
  return `${sign}${Math.abs(degrees)}°`
}

function formatAzimuth(azimuth) {
  return `${Math.round(((azimuth % 360) + 360) % 360) % 360}°`
}

function projectDirection(azimuth, altitude, cameraAzimuth, cameraAltitude) {
  const azimuthRadians = azimuth * DEG
  const altitudeRadians = altitude * DEG
  const x = Math.sin(azimuthRadians) * Math.cos(altitudeRadians)
  const y = Math.sin(altitudeRadians)
  const z = Math.cos(azimuthRadians) * Math.cos(altitudeRadians)

  const azimuthCosine = Math.cos(cameraAzimuth * DEG)
  const azimuthSine = Math.sin(cameraAzimuth * DEG)
  const rotatedX = x * azimuthCosine - z * azimuthSine
  const rotatedZ = x * azimuthSine + z * azimuthCosine

  const altitudeCosine = Math.cos(cameraAltitude * DEG)
  const altitudeSine = Math.sin(cameraAltitude * DEG)
  const rotatedY = y * altitudeCosine - rotatedZ * altitudeSine
  const depth = y * altitudeSine + rotatedZ * altitudeCosine

  return { x: rotatedX, y: rotatedY, depth }
}

function getVisibleArcs(points, cameraAzimuth, cameraAltitude) {
  const arcs = []
  let currentArc = null
  for (const [azimuth, altitude] of points) {
    const projected = projectDirection(azimuth, altitude, cameraAzimuth, cameraAltitude)
    if (projected.depth <= 0.02) {
      currentArc = null
      continue
    }
    if (!currentArc) {
      currentArc = { points: [], depth: 0 }
      arcs.push(currentArc)
    }
    currentArc.points.push(
      `${(BALL_CENTER + projected.x * BALL_RADIUS).toFixed(2)},${(BALL_CENTER - projected.y * BALL_RADIUS).toFixed(2)}`,
    )
    currentArc.depth = Math.max(currentArc.depth, projected.depth)
  }
  return arcs.filter((arc) => arc.points.length > 1)
}

function createGridLines(azimuth, altitude) {
  const lines = []
  for (let meridian = 0; meridian < 360; meridian += 30) {
    const points = []
    for (let pointAltitude = -90; pointAltitude <= 90; pointAltitude += ARC_STEP) {
      points.push([meridian, pointAltitude])
    }
    for (const arc of getVisibleArcs(points, azimuth, altitude)) {
      lines.push({ key: `m${meridian}_${arc.points[0]}`, arc, opacity: 0.05 + 0.15 * arc.depth })
    }
  }

  for (const parallel of [-60, -30, 0, 30, 60]) {
    const points = []
    for (let pointAzimuth = 0; pointAzimuth <= 360; pointAzimuth += ARC_STEP) {
      points.push([pointAzimuth, parallel])
    }
    const isHorizon = parallel === 0
    for (const arc of getVisibleArcs(points, azimuth, altitude)) {
      lines.push({
        key: `p${parallel}_${arc.points[0]}`,
        arc,
        opacity: (isHorizon ? 0.22 : 0.07) + (isHorizon ? 0.32 : 0.12) * arc.depth,
      })
    }
  }
  return lines
}

function createFaceMarks(azimuth, altitude) {
  return FACE_MARKS.flatMap((mark) => {
    const projected = projectDirection(mark.azimuth, mark.altitude, azimuth, altitude)
    return projected.depth <= 0.12
      ? []
      : [{
          ...mark,
          x: BALL_CENTER + projected.x * BALL_RADIUS,
          y: BALL_CENTER - projected.y * BALL_RADIUS,
          depth: projected.depth,
        }]
  })
}

export default function Compass({ ref }) {
  const [{ direction, visible }, setState] = useState({ direction: null, visible: false })
  useImperativeHandle(
    ref,
    () => ({
      setDirection: (next) => setState((previous) => (
        next
          ? { direction: next, visible: true }
          : { direction: previous.direction, visible: false }
      )),
    }),
    [],
  )

  if (!direction) return null
  const azimuth = direction.azDeg
  const altitude = direction.altDeg

  return (
    <div className={`sky-compass${visible ? ' sky-compass--on' : ''}`}>
      <svg className='sky-compass-ball' viewBox={`0 0 ${BALL_CENTER * 2} ${BALL_CENTER * 2}`}>
        <circle
          cx={BALL_CENTER}
          cy={BALL_CENTER}
          r={BALL_RADIUS}
          fill='none'
          stroke='#FFFFFF'
          strokeOpacity='0.28'
          strokeWidth='1'
        />
        {createGridLines(azimuth, altitude).map(({ key, arc, opacity }) => (
          <polyline
            key={key}
            points={arc.points.join(' ')}
            fill='none'
            stroke='#FFFFFF'
            strokeOpacity={opacity}
            strokeWidth='1'
          />
        ))}
        {createFaceMarks(azimuth, altitude).map((mark) => (
          <text
            key={mark.label + mark.azimuth}
            x={mark.x}
            y={mark.y + 3}
            textAnchor='middle'
            fill='#FFFFFF'
            fillOpacity={0.15 + 0.65 * mark.depth}
          >
            {mark.label}
          </text>
        ))}
        <path
          d={`M ${BALL_CENTER - 7} ${BALL_CENTER} h 4
            M ${BALL_CENTER + 3} ${BALL_CENTER} h 4
            M ${BALL_CENTER} ${BALL_CENTER - 7} v 4
            M ${BALL_CENTER} ${BALL_CENTER + 3} v 4`}
          stroke='currentColor'
          strokeWidth='1'
          strokeOpacity='0.9'
          fill='none'
        />
      </svg>
      <div className='sky-compass-readout'>
        <div>ALT: {formatAltitude(altitude)}</div>
        <div>AZ: {formatAzimuth(azimuth)}</div>
      </div>
    </div>
  )
}
