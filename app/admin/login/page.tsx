'use client'

import { useActionState } from 'react'
import { loginDueno, type EstadoLogin } from '@/lib/auth/acciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sticker } from '@/components/marca/Sticker'
import { BotonTema } from '@/components/tema/BotonTema'

const inicial: EstadoLogin = { error: null }

export default function LoginAdmin() {
  const [estado, accion, pendiente] = useActionState(loginDueno, inicial)
  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 py-20">
      <BotonTema className="absolute right-4 top-4" />
      <Sticker size={120} />
      <Card className="w-full max-w-sm border-border bg-card shadow-sm">
        <CardHeader>
          <CardTitle className="font-heading text-xl text-marca">Ingreso al panel</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={accion} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {estado.error && (
              <p role="alert" className="text-sm text-destructive dark:text-red-300">
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
