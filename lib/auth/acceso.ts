export type Rol = 'dueno' | 'empleado'
export type Perfil = { id: string; nombre: string; rol: Rol; activo: boolean }
export type Seccion = 'pos' | 'admin'

export function resolverAcceso(
  perfil: Pick<Perfil, 'rol' | 'activo'> | null,
  seccion: Seccion,
): 'permitir' | 'login' {
  if (!perfil || !perfil.activo) return 'login'
  if (seccion === 'admin' && perfil.rol !== 'dueno') return 'login'
  return 'permitir'
}
