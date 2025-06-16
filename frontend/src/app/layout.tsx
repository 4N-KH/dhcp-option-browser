import './globals.css'
import { ReactNode } from 'react'
import { Geist } from 'next/font/google'

const geist = Geist({ subsets: ['latin'], weight: ['400', '700'] })

export const metadata = {
  title: 'DHCP Option Browser',
  description: 'Analyse und Optimierung von DHCP-Konfigurationen',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="de" className={geist.className}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {children}
      </body>
    </html>
  )
}
