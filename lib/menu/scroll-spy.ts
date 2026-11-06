export function seccionActiva(posiciones: { id: string; top: number }[], offset: number) {
  let activa = posiciones[0]?.id
  for (const posicion of posiciones) {
    if (posicion.top <= offset) activa = posicion.id
    else break
  }
  return activa
}
