import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'CurveLab — IEM Auto-PEQ',
  description: 'Upload a measurement, choose a target, and generate clean parametric EQ filters with a live graph preview.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
