import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Plant Watering Tracker',
  description: 'Track your plants watering schedule',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
