function agrupar(entero: string): string {
  return entero.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function formatoGs(n: number): string {
  return `₲ ${agrupar(Math.round(n).toString())}`
}

export function formatoTasa(n: number): string {
  return `₲ ${n.toLocaleString('es-PY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function formatoBrl(n: number): string {
  if (!Number.isFinite(n)) return `R$ ${n.toFixed(2)}`
  const centavos = decimalesAEntero(n, 2)
  const negativo = centavos < BigInt(0)
  const digitos = (negativo ? -centavos : centavos).toString().padStart(3, '0')
  const entero = `${negativo ? '-' : ''}${digitos.slice(0, -2)}`
  const decimales = digitos.slice(-2)
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
import { decimalesAEntero } from './redondeo'

