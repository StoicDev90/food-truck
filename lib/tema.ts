export type Tema = 'claro' | 'oscuro'
export type ClaveTema = 'tema-menu' | 'tema-staff'

export function claveTema(pathname: string): ClaveTema {
  return /^\/(pos|admin)(\/|$)/.test(pathname) ? 'tema-staff' : 'tema-menu'
}

export function resolverTema(guardado: string | null, prefiereOscuro: boolean): Tema {
  return guardado === 'claro' || guardado === 'oscuro' ? guardado : prefiereOscuro ? 'oscuro' : 'claro'
}

// La lectura de almacenamiento puede fallar en modo privado; el sistema sigue siendo la alternativa.
export const SCRIPT_TEMA = `(function(){var oscuro=false;try{oscuro=window.matchMedia('(prefers-color-scheme: dark)').matches}catch(e){}try{var clave=/^\\/(pos|admin)(\\/|$)/.test(location.pathname)?'tema-staff':'tema-menu';var guardado=localStorage.getItem(clave);if(guardado==='oscuro'||guardado==='claro')oscuro=guardado==='oscuro'}catch(e){}document.documentElement.classList.toggle('dark',oscuro)})()`
