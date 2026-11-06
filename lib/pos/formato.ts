function agrupar(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatoGs(n: number): string {
  return `₲ ${agrupar(Math.round(n).toString())}`
}

export function formatoBrl(n: number): string {
  const [entero, decimales] = n.toFixed(2).split('.')
  return `R$ ${agrupar(entero)},${decimales}`
}

export function parseMontoGs(s: string): number | null {
  const monto = s.trim().replace(/^₲\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)$/.test(monto)) return null
  const valor = Number(monto.replace(/\./g, ''))
  return Number.isSafeInteger(valor) ? valor : null
}

export function parseMontoBrl(s: string): number | null {
  const monto = s.trim().replace(/^R\$\s*/, '')
  if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{1,2})?$/.test(monto)) return null
  const valor = Number(monto.replace(/\./g, '').replace(',', '.'))
  return Number.isFinite(valor) && valor <= Number.MAX_SAFE_INTEGER / 100 ? valor : null
}
