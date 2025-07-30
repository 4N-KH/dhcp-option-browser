import './globals.css'
import { ReactNode } from 'react'
import { Geist } from 'next/font/google'
import QueryProvider from './QueryProvider'

const geist = Geist({ subsets: ['latin'], weight: ['400', '700'] })

export const metadata = {
  title: 'DHCP Option Browser',
  description: 'Analysis and optimization of DHCP configurations',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={geist.className}>
      <body className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <QueryProvider>
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}
