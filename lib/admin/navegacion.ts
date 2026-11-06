export const SECCIONES_ADMIN: { titulo: string | null; items: { href: string; etiqueta: string }[] }[] = [
  { titulo: null, items: [{ href: '/admin', etiqueta: 'Hoy' }] },
  { titulo: 'Operación', items: [{ href: '/admin/turnos', etiqueta: 'Turnos y cierres' }, { href: '/admin/caja', etiqueta: 'Movimientos de caja' }, { href: '/pos', etiqueta: 'Abrir POS' }] },
  { titulo: 'Catálogo', items: [{ href: '/admin/productos', etiqueta: 'Productos' }, { href: '/admin/stock', etiqueta: 'Stock' }, { href: '/admin/categorias', etiqueta: 'Categorías' }] },
  { titulo: 'Reportes', items: [{ href: '/admin/reportes/ventas', etiqueta: 'Ventas' }, { href: '/admin/reportes/mas-vendidos', etiqueta: 'Más vendidos' }, { href: '/admin/reportes/anulaciones', etiqueta: 'Anulaciones' }] },
  { titulo: 'Ajustes', items: [{ href: '/admin/empleados', etiqueta: 'Empleados' }, { href: '/admin/cotizacion', etiqueta: 'Cotización R$' }, { href: '/admin/negocio', etiqueta: 'Negocio y menú' }] },
]
