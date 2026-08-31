import './styles.css'

export default function Cursor({ ref }) {
  return (
    <div className='sky-cursor' ref={ref}>
      <svg viewBox='0 0 64 64' fill='none' stroke='currentColor'>
        <path d='M16 9h-11v46h11M48 9h11v46h-11' vectorEffect='non-scaling-stroke' />
      </svg>
      <div className='sky-cursor-plus'>+</div>
    </div>
  )
}
