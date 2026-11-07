export function destinoPermitido(url: string | undefined, refRemoto: string | null): boolean {
  try {
    const destino = new URL(url ?? '')
    if (refRemoto === null) return destino.hostname === '127.0.0.1' || destino.hostname === 'localhost'
    return /^[a-z0-9]{20}$/.test(refRemoto)
      && destino.protocol === 'https:'
      && destino.host === `${refRemoto}.supabase.co`
  } catch {
    return false
  }
}
