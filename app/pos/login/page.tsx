'use client'

import { useActionState } from 'react'
import { loginEmpleado, type EstadoLogin } from '@/lib/auth/acciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sticker } from '@/components/marca/Sticker'
import { BotonTema } from '@/components/tema/BotonTema'

const inicial: EstadoLogin = { error: null }

export default function LoginPos() {
  const [estado, accion, pendiente] = useActionState(loginEmpleado, inicial)
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
      <BotonTema className="absolute right-4 top-4" />
      <Sticker size={120} />
      <Card className="w-full max-w-sm border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-marca">Ingreso al punto de venta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={accion} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input className="min-h-11" id="usuario" name="usuario" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
                className="min-h-11"
                id="pin"
                name="pin"
                type="password"
                inputMode="numeric"
                maxLength={6}
                autoComplete="current-password"
                required
              />
            </div>
            {estado.error && (
              <p role="alert" className="text-sm text-destructive-texto">
                {estado.error}
              </p>
            )}
            <Button type="submit" disabled={pendiente} className="min-h-11 font-heading">
              {pendiente ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
