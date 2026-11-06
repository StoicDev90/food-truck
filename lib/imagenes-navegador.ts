export function medidasAchicadas(ancho: number, alto: number, ladoMax: number): { ancho: number; alto: number } {
  const escala = Math.min(1, ladoMax / Math.max(ancho, alto))
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) }
}

export async function achicarImagen(archivo: File, ladoMax = 600, calidad = 0.82): Promise<Blob> {
  try {
    const imagen = await createImageBitmap(archivo)
    try {
      const { ancho, alto } = medidasAchicadas(imagen.width, imagen.height, ladoMax)
      const canvas = document.createElement('canvas')
      canvas.width = ancho
      canvas.height = alto
      const contexto = canvas.getContext('2d')
      if (!contexto) return archivo
      contexto.drawImage(imagen, 0, 0, ancho, alto)
      const resultado = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', calidad))
      return resultado?.type === 'image/webp' ? resultado : archivo
    } finally {
      imagen.close()
    }
  } catch {
    return archivo
  }
}
