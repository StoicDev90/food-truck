export const DIAS = ['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom'] as const
export type Horarios = Record<(typeof DIAS)[number], { abre: string; cierra: string } | null>

export function validarHorarios(x: unknown): Horarios | null {
  if (!x || typeof x !== 'object' || Array.isArray(x)) return null
  const dias = x as Record<string, unknown>
  const resultado = {} as Horarios
  for (const dia of DIAS) {
    const valor = dias[dia]
    if (valor === null) { resultado[dia] = null; continue }
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return null
    const { abre, cierra } = valor as Record<string, unknown>
    const horaValida = (hora: unknown): hora is string => typeof hora === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(hora)
    if (!horaValida(abre) || !horaValida(cierra)) return null
    resultado[dia] = { abre, cierra }
  }
  return resultado
}
