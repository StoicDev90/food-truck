'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { crearClienteServidor } from '@/lib/supabase/server'
import { DOMINIO_EMPLEADOS, emailDeUsuario, validarPin, validarUsuario } from './empleado'
import { resolverAcceso, type Seccion } from './acceso'
import { obtenerPerfil } from './sesion'
import { passwordEmpleado } from './pin'
import {
  claveCuentaDueno,
  claveCuentaEmpleado,
  ipDeEncabezados,
  limpiarFallos,
  MENSAJE_BLOQUEO,
  reservarIntento,
} from './limite-login'

export type EstadoLogin = { error: string | null }

const campo = (fd: FormData, nombre: string) => {
  const v = fd.get(nombre)
  return typeof v === 'string' ? v : ''
}

export async function loginEmpleado(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const error = { error: 'Usuario o PIN incorrecto' }
  const usuario = campo(fd, 'usuario')
  const pin = campo(fd, 'pin')
  if (!validarUsuario(usuario) || !validarPin(pin)) return error

  const cuenta = claveCuentaEmpleado(usuario)
  const ip = ipDeEncabezados(await headers())
  if (!(await reservarIntento(cuenta, ip))) return { error: MENSAJE_BLOQUEO }

  const supabase = await crearClienteServidor()
  const { error: e } = await supabase.auth.signInWithPassword({
    email: emailDeUsuario(usuario),
    password: passwordEmpleado(usuario, pin),
  })
  if (e) return error
  await limpiarFallos(cuenta, ip)

  const perfil = await obtenerPerfil()
  if (!perfil || resolverAcceso(perfil, 'pos') === 'login') {
    await supabase.auth.signOut()
    return error
  }
  redirect('/pos')
}

export async function loginDueno(_prev: EstadoLogin, fd: FormData): Promise<EstadoLogin> {
  const email = campo(fd, 'email').trim()
  // Los empleados tienen su propio contador (por usuario); este formulario no puede ser un segundo.
  if (
    !email.includes('@') ||
    email.length > 254 ||
    email.toLowerCase().endsWith(DOMINIO_EMPLEADOS)
  ) {
    return { error: 'Email o contraseña incorrectos' }
  }
  const cuenta = claveCuentaDueno(email)
  const ip = ipDeEncabezados(await headers())
  if (!(await reservarIntento(cuenta, ip))) return { error: MENSAJE_BLOQUEO }

  const supabase = await crearClienteServidor()
  const { error: e } = await supabase.auth.signInWithPassword({
    email,
    password: campo(fd, 'password'),
  })
  if (e) return { error: 'Email o contraseña incorrectos' }
  await limpiarFallos(cuenta, ip)

  const perfil = await obtenerPerfil()
  if (!perfil || resolverAcceso(perfil, 'admin') === 'login') {
    await supabase.auth.signOut()
    return { error: 'Esta cuenta no tiene acceso al panel' }
  }
  redirect('/admin')
}

export async function cerrarSesion(seccion: Seccion): Promise<void> {
  const supabase = await crearClienteServidor()
  await supabase.auth.signOut()
  redirect(seccion === 'admin' ? '/admin/login' : '/pos/login')
}
