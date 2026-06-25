import './globals.css'
import './styles.css'

export const metadata = {
  title: 'Adeena\'s World',
}

export default function RootLayout({ children }) {
  return (
    <html lang='en'>
      <head>
        <link rel='preconnect' href='https://fonts.googleapis.com' />
        <link rel='preconnect' href='https://fonts.gstatic.com' crossOrigin='anonymous' />
        <link href='https://fonts.googleapis.com/css2?family=Source+Code+Pro:ital,wght@0,200..900;1,200..900&display=swap' rel='stylesheet' />
      </head>
      <body>{children}</body>
    </html>
  )
}
