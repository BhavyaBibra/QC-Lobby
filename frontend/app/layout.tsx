import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'QC Lobby - Video Quality Control',
  description: 'Professional video quality control SaaS platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>{children}</body>
    </html>
  )
}
