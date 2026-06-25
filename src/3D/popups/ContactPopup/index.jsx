import './styles.css'
import { EMAIL, LINKEDIN } from '@/data/links.js'

export default function ContactPopup({ onClose }) {
  return (
    <div className='popup-overlay'>
      <div className='popup popup-static' onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className='popup-close'>×</button>
        <a href={`mailto:${EMAIL}`} className='popup-link'>{EMAIL}</a>
        <a href={LINKEDIN} target='_blank' rel='noreferrer' className='popup-link'>{LINKEDIN.replace('https://', '')}</a>
      </div>
    </div>
  )
}
