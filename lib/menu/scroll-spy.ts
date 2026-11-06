export const OFFSET_ANCLA_MENU = 144

export function seccionActiva(posiciones: { id: string; top: number }[], offset: number, alFinal = false) {
  if (alFinal) return posiciones.at(-1)?.id
  let activa = posiciones[0]?.id
  for (const posicion of posiciones) {
    if (posicion.top <= Math.max(offset, OFFSET_ANCLA_MENU)) activa = posicion.id
    else break
  }
  return activa
}
