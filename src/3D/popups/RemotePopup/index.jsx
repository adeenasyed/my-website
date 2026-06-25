import './styles.css'
import { LED_COLORS } from '@/theme.js'

const SCREENS = ['LISTENING ACTIVITY', 'ALBUM OF THE MONTH']

export default function RemotePopup({ ledColor, tvZoom, onClose, onEscape, setTVMode, setLEDColor }) {
  return (
    <div className='remote-anchor' onClick={(e) => e.stopPropagation()}>
      <div className='popup remote-popup' style={{ '--accent': ledColor, '--accent-shadow': `${ledColor}44`, '--accent-border': `${ledColor}33` }}>
        <button onClick={tvZoom ? onEscape : onClose} className='popup-close'>×</button>
        <div className='popup-label remote-popup-select-label'>SELECT</div>
        {SCREENS.map((label, i) => (
          <button key={label} onClick={() => setTVMode(i)} className='popup-button'>
            {label}
          </button>
        ))}
        {!tvZoom && (
          <div className='remote-led-section'>
            <div className='popup-label remote-popup-leds-label'>LEDS</div>
            <div className='color-swatch-row'>
              {LED_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setLEDColor(color)}
                  className='color-swatch'
                  style={{ background: color, boxShadow: `0 0 6px ${color}88` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
