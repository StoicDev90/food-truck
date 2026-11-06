import type { DatosMenu } from '@/lib/menu/armar'
import { filasHorario } from '@/lib/menu/horario'

export function PieMenu({ menu }: { menu: DatosMenu }) {
  const filas = filasHorario(menu.horarios)
  const enlace = 'flex min-h-11 w-full items-center justify-center rounded-full border border-border bg-card px-5 py-3 font-bold transition-colors hover:bg-accent motion-reduce:transition-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring'
  return <footer className="mt-12 border-t border-border pt-8 pb-12">
    <h2 className="font-heading text-2xl font-semibold text-marca">Horarios</h2>
    {filas.length ? <dl className="mt-4 space-y-2 text-sm">{filas.map(f => <div key={f.dia} className="flex justify-between gap-4"><dt>{f.dia}</dt><dd>{f.texto}</dd></div>)}</dl> : <p className="mt-4">Horario no disponible</p>}
    <div className="mt-7 grid gap-3">
      {menu.ubicacion && <a className={enlace} href={menu.ubicacion} target="_blank" rel="noopener noreferrer">Cómo llegar</a>}
      {menu.whatsapp && <a className={enlace} href={`https://wa.me/${menu.whatsapp}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
      {menu.instagram && <a className={enlace} href={`https://instagram.com/${menu.instagram}`} target="_blank" rel="noopener noreferrer">Instagram</a>}
    </div>
  </footer>
}
