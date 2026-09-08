import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Ledgerline | Enterprise invoicing',
  description: 'A focused workspace for multi-tenant invoicing teams.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  )
}
