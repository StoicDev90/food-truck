'use client'

import { useActionState } from 'react'
import { loginDueno, type EstadoLogin } from '@/lib/auth/acciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const inicial: EstadoLogin = { error: null }

export default function LoginAdmin() {
  const [estado, accion, pendiente] = useActionState(loginDueno, inicial)
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ingreso al panel</CardTitle>
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
              <p role="alert" className="text-sm text-destructive">
                {estado.error}
              </p>
            )}
            <Button type="submit" disabled={pendiente}>
              {pendiente ? 'Ingresando…' : 'Ingresar'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
