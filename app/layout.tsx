import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: {
    default: 'SMS Panel',
    template: '%s | SMS Panel',
  },
  description: 'Profesyonel SMS Yönetim Paneli',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr" className="dark" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans min-h-screen bg-background antialiased`}>
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: 'hsl(240 10% 8%)',
              border: '1px solid hsl(240 5% 16%)',
              color: 'hsl(0 0% 98%)',
            },
          }}
          richColors
        />
      </body>
    </html>
  )
}
