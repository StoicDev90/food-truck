type Props = { size?: number; variante?: 'tema' | 'noche' }

export function Palmera({ size = 100, variante = 'tema' }: Props) {
  const color = variante === 'noche' ? 'var(--logo-icono-noche)' : 'var(--logo-icono)'
  const sol = variante === 'noche' ? 'var(--logo-sol-noche)' : 'var(--logo-sol)'
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Oasis Itaipu">
    <circle cx="68" cy="58" r="16" fill={sol} />
    <g stroke={color} strokeWidth="9" fill="none" strokeLinecap="round">
      <path d="M52 90 C49 70 47 55 52 38" /><path d="M52 38 C40 27 27 29 17 40" /><path d="M52 38 C42 21 29 17 19 22" /><path d="M52 38 C57 21 68 17 80 22" /><path d="M52 38 C64 28 77 30 87 41" />
    </g>
  </svg>
}
