export type ProductoPos = {
  id: string
  nombre: string
  precioGs: number
  stock: number
  controlaStock: boolean
  categoriaId: string
}

export type LineaPedido = {
  productoId: string
  nombre: string
  precioGs: number
  cantidad: number
}

export type Pedido = LineaPedido[]

export function cantidadDe(p: Pedido, productoId: string): number {
  return p.find(linea => linea.productoId === productoId)?.cantidad ?? 0
}

export function agregar(p: Pedido, prod: ProductoPos): Pedido {
  const cantidad = cantidadDe(p, prod.id)
  if (prod.controlaStock && cantidad >= prod.stock) return p
  if (cantidad > 0) {
    return p.map(linea => linea.productoId === prod.id ? { ...linea, cantidad: linea.cantidad + 1 } : linea)
  }
  return [...p, { productoId: prod.id, nombre: prod.nombre, precioGs: prod.precioGs, cantidad: 1 }]
}

export function quitar(p: Pedido, productoId: string): Pedido {
  return p.flatMap(linea => {
    if (linea.productoId !== productoId) return [linea]
    return linea.cantidad > 1 ? [{ ...linea, cantidad: linea.cantidad - 1 }] : []
  })
}

export function totalGs(p: Pedido): number {
  return p.reduce((total, linea) => total + linea.precioGs * linea.cantidad, 0)
}

export function itemsParaVenta(p: Pedido): { producto_id: string; cantidad: number }[] {
  return p.map(linea => ({ producto_id: linea.productoId, cantidad: linea.cantidad }))
}
