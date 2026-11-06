export const normalizarUsuario = (s: string): string => s.trim().toLowerCase()

export const validarUsuario = (s: string): boolean =>
  /^[a-z0-9_]{3,20}$/.test(normalizarUsuario(s))

export const validarPin = (pin: string): boolean => /^\d{6}$/.test(pin)

export const emailDeUsuario = (usuario: string): string =>
  `${normalizarUsuario(usuario)}@empleados.local`
