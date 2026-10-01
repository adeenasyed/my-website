export default function LandingView({ canEnter }) {
  if (canEnter) return null

  return (
    <div className='landing'>
      <div className='landing-prompt'>GET A BIGGER SCREEN</div>
    </div>
  )
}
