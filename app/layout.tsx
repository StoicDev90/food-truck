import type { Metadata } from 'next'
import { Fredoka, Nunito } from 'next/font/google'
import { SCRIPT_TEMA } from '@/lib/tema'
import './globals.css'

const fredoka = Fredoka({ variable: '--font-fredoka', subsets: ['latin'], weight: ['600', '700'] })
const nunito = Nunito({ variable: '--font-nunito', subsets: ['latin'], weight: ['400', '500', '600', '700', '800', '900'] })

export const metadata: Metadata = {
  title: 'Oasis Itaipu',
  description: 'Menú, punto de venta y panel del food truck Oasis Itaipu',
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return <html lang="es" suppressHydrationWarning className={`${fredoka.variable} ${nunito.variable} h-full antialiased`}>
    <head><script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} /></head>
    <body className="flex min-h-full flex-col bg-background font-sans text-foreground">{children}</body>
  </html>
}
