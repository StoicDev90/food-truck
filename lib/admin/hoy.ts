import { formatoBrl, formatoGs } from '@/lib/pos/formato'

export const STOCK_BAJO = 5
export type Alerta = { tipo: 'sin_stock' | 'stock_bajo' | 'diferencia' | 'anuladas'; texto: string; href: string }
type Entrada = {
  productos: { id: string; nombre: string; stock: number; controlaStock: boolean; activo: boolean }[]
  ultimoCierre: { empleadoNombre: string; fecha: string; diferenciaGs: number; diferenciaBrl: number } | null
  anuladasHoy: number
}
export function alertasHoy({ productos, ultimoCierre, anuladasHoy }: Entrada): Alerta[] {
  const disponibles = productos.filter(p => p.activo && p.controlaStock)
  const stock = (sinStock: boolean): Alerta[] => disponibles.filter(p => sinStock ? p.stock <= 0 : p.stock > 0 && p.stock <= STOCK_BAJO).map(p => ({ tipo: sinStock ? 'sin_stock' : 'stock_bajo', texto: sinStock ? `${p.nombre} sin stock` : `${p.nombre} · quedan ${p.stock}`, href: `/admin/stock?producto=${encodeURIComponent(p.id)}` }))
  const alertas = [...stock(true), ...stock(false)]
  if (ultimoCierre) {
    const diferencias = [[ultimoCierre.diferenciaGs, formatoGs], [ultimoCierre.diferenciaBrl, formatoBrl]] as const
    const detalles = diferencias.filter(([n]) => n !== 0).map(([n, formato]) => `${n < 0 ? 'faltan' : 'sobran'} ${formato(Math.abs(n))}`)
    if (detalles.length) alertas.push({ tipo: 'diferencia', texto: `Cierre de ${ultimoCierre.fecha} (${ultimoCierre.empleadoNombre}): ${detalles.join(' · ')}`, href: '/admin/turnos' })
  }
  if (anuladasHoy > 0) alertas.push({ tipo: 'anuladas', texto: `${anuladasHoy} ${anuladasHoy === 1 ? 'venta anulada' : 'ventas anuladas'} hoy`, href: '/admin/reportes/anulaciones' })
  return alertas
}
