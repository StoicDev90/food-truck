'use client'

import { useActionState } from 'react'
import { loginEmpleado, type EstadoLogin } from '@/lib/auth/acciones'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const inicial: EstadoLogin = { error: null }

export default function LoginPos() {
  const [estado, accion, pendiente] = useActionState(loginEmpleado, inicial)
  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Ingreso al punto de venta</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={accion} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="usuario">Usuario</Label>
              <Input id="usuario" name="usuario" autoComplete="username" required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="pin">PIN</Label>
              <Input
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
