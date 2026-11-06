'use client'
import { useState } from 'react'
import { DialogoMovimientoCaja } from '@/components/pos/DialogoMovimientoCaja'
export function MovimientoCaja({ hayTurno }: { hayTurno: boolean }) {
  const [abierto, setAbierto] = useState(false)
  return <section className="space-y-3"><button className="min-h-11 rounded-md bg-primary px-4 text-primary-foreground" onClick={() => hayTurno && setAbierto(true)}>Registrar movimiento</button>{!hayTurno && <p>Abrí un turno para registrar movimientos de caja.</p>}{abierto && <DialogoMovimientoCaja onCerrar={() => setAbierto(false)} mostrarCancelar />}</section>
}
