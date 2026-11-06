export function urlImagen(path: string | null): string | null {
  return path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imagenes/${path}` : null
}

export function pathImagenValido(path: string, carpeta: 'productos' | 'marca'): boolean {
  return typeof path === 'string' && new RegExp(`^${carpeta}/[a-z0-9-]{1,80}\\.(jpg|jpeg|png|webp)$`).test(path)
}
