import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FiltroFechas({ desde, hasta }: { desde: string; hasta: string }) {
  return <form method="get" className="flex flex-wrap items-end gap-4">
    <div className="grid gap-2"><Label htmlFor="desde">Desde</Label><Input className="min-h-11" id="desde" name="desde" type="date" defaultValue={desde} /></div>
    <div className="grid gap-2"><Label htmlFor="hasta">Hasta</Label><Input className="min-h-11" id="hasta" name="hasta" type="date" defaultValue={hasta} /></div>
    <Button type="submit" className="min-h-11">Ver</Button>
  </form>
}
