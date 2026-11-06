export const CODIGOS_ERROR = [
  'EMPLEADO_ALTA_INCOMPLETA',
  'PIN_ACTUALIZADO_SIN_DESBLOQUEAR',
  'USUARIO_EXISTE',
  'CATEGORIA_EN_USO',
  'NO_AUTORIZADO',
  'VALOR_INVALIDO',
  'MOTIVO_REQUERIDO',
  'CANTIDAD_INVALIDA',
  'SIN_TURNO_ABIERTO',
  'TURNO_YA_ABIERTO',
  'TURNO_CERRADO',
  'TURNO_ABIERTO',
  'STOCK_INSUFICIENTE',
  'PRODUCTO_INACTIVO',
  'VENTA_VACIA',
  'SIN_COTIZACION',
  'MONTO_INSUFICIENTE',
  'VENTA_NO_ANULABLE',
] as const

export type CodigoError = (typeof CODIGOS_ERROR)[number]

export const MENSAJES_ERROR: Record<CodigoError, string> = {
  EMPLEADO_ALTA_INCOMPLETA: 'La cuenta quedó creada a medias. Pedí al administrador que elimine el usuario de Auth antes de volver a intentar.',
  PIN_ACTUALIZADO_SIN_DESBLOQUEAR: 'El PIN nuevo ya está establecido, pero no se pudo desbloquear la cuenta. Usá Desbloquear.',
  USUARIO_EXISTE: 'Ese usuario ya existe. Elegí otro.',
  CATEGORIA_EN_USO: 'La categoría tiene productos. Movelos antes de borrarla.',
  NO_AUTORIZADO: 'No tenés permiso para realizar esta acción.',
  VALOR_INVALIDO: 'El valor ingresado no es válido.',
  MOTIVO_REQUERIDO: 'Tenés que indicar un motivo.',
  CANTIDAD_INVALIDA: 'La cantidad no es válida.',
  SIN_TURNO_ABIERTO: 'No hay un turno abierto.',
  TURNO_YA_ABIERTO: 'Ya hay un turno abierto.',
  TURNO_CERRADO: 'El turno ya está cerrado.',
  TURNO_ABIERTO: 'Hay un turno abierto. Cerralo primero.',
  STOCK_INSUFICIENTE: 'No hay stock suficiente.',
  PRODUCTO_INACTIVO: 'El producto está inactivo.',
  VENTA_VACIA: 'La venta no tiene productos.',
  SIN_COTIZACION: 'No hay cotización del real para hoy. Un dueño debe cargarla.',
  MONTO_INSUFICIENTE: 'El monto recibido no alcanza para cubrir el total.',
  VENTA_NO_ANULABLE: 'Esta venta no se puede anular.',
}

export function codigoDeError(e: { message: string } | null): CodigoError | null {
  if (!e) return null
  return (CODIGOS_ERROR as readonly string[]).includes(e.message) ? (e.message as CodigoError) : null
}
