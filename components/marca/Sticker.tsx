import { useId } from 'react'
import type { Tema } from '@/lib/tema'

export function Sticker({ tema, size = 120 }: { tema?: Tema; size?: number }) {
  const id = useId().replace(/:/g, '')
  const prefijo = tema === 'oscuro' ? '--logo-noche' : tema === 'claro' ? '--logo-claro' : '--logo'
  const color = (rol: string) => `var(${prefijo}-${rol})`
  return <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Oasis Itaipu" className="font-heading">
    <defs><path id={`${id}-a`} d="M20 60 a40 40 0 0 1 80 0" /><path id={`${id}-b`} d="M14 60 a46 46 0 0 0 92 0" /></defs>
    <circle cx="60" cy="60" r="56" fill={color('fondo')} stroke={color('aro')} strokeWidth="3" />
    <text fontSize="15" fontWeight="700" fill={color('aro')} letterSpacing="2"><textPath href={`#${id}-a`} startOffset="50%" textAnchor="middle">OASIS ITAIPU</textPath></text>
    <text fontSize="8.5" fontWeight="600" fill={color('texto')} letterSpacing="2"><textPath href={`#${id}-b`} startOffset="50%" textAnchor="middle">PARQUE TACURÚ PUCÚ</textPath></text>
    <g transform="translate(36 42) scale(.48)"><circle cx="68" cy="58" r="16" fill={color('sol')} /><g stroke={color('palmera')} strokeWidth="7" fill="none" strokeLinecap="round"><path d="M52 90 C49 70 47 55 52 38" /><path d="M52 38 C40 27 27 29 17 40" /><path d="M52 38 C42 21 29 17 19 22" /><path d="M52 38 C57 21 68 17 80 22" /><path d="M52 38 C64 28 77 30 87 41" /></g></g>
  </svg>
}
