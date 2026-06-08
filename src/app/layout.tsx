import { Analytics } from '@vercel/analytics/react'
import type { Metadata } from 'next'
import { Poppins, Inter, Geist_Mono } from 'next/font/google'
import './globals.css'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['500', '600', '700'],
  subsets: ['latin'],
})
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MyKeja — Find your next home in Kenya',
  description:
    'MyKeja is a trusted house hunting platform for Kenya. Browse verified listings, lock your choice for 3 days, and pay securely via M-Pesa.',
  generator: 'v0.app',
  openGraph: {
    title: 'MyKeja — Find your next home in Kenya',
    description:
      'Browse verified listings, lock your choice, and pay securely via M-Pesa.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} ${geistMono.variable} bg-background`}
    >
      <body className="font-sans antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
