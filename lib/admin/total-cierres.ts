import type { mapCierre } from '@/lib/caja/resumen'

type Cierre = ReturnType<typeof mapCierre>

export function totalCierres(cierres: Cierre[]) {
  const sumar = (campo: 'contadoGs' | 'contadoBrl' | 'diferenciaGs' | 'diferenciaBrl') =>
    cierres.reduce<number | null>((total, cierre) => total === null || cierre[campo] === null ? null : total + cierre[campo], 0)
  return {
    esperadoGs: cierres.reduce((total, c) => total + c.esperadoGs, 0),
    esperadoBrl: cierres.reduce((total, c) => total + c.esperadoBrl, 0),
    contadoGs: sumar('contadoGs'), contadoBrl: sumar('contadoBrl'),
    diferenciaGs: sumar('diferenciaGs'), diferenciaBrl: sumar('diferenciaBrl'),
  }
}
