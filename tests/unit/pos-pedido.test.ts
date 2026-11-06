import { describe, expect, it } from 'vitest'
import { agregar, cantidadDe, itemsParaVenta, quitar, totalGs, type ProductoPos } from '../../lib/pos/pedido'

const producto: ProductoPos = { id: '1', nombre: 'Comida', precioGs: 8000, stock: 10, controlaStock: true, categoriaId: 'a' }

describe('pedido', () => {
  it('agrupa productos y respeta el stock', () => {
    const pedido = agregar(agregar([], producto), producto)
    expect(pedido).toHaveLength(1)
    expect(cantidadDe(pedido, producto.id)).toBe(2)
    const limitado = { ...producto, stock: 1 }
    expect(cantidadDe(agregar(agregar([], limitado), limitado), limitado.id)).toBe(1)
    expect(cantidadDe(agregar([], { ...producto, stock: 0, controlaStock: false }), producto.id)).toBe(1)
    expect(agregar([], { ...producto, stock: 0 })).toEqual([])
  })
  it('quita líneas y calcula el total y los items de venta', () => {
    expect(quitar(agregar([], producto), producto.id)).toEqual([])
    const pedido = agregar(agregar(agregar([], producto), producto), { ...producto, id: '2', precioGs: 15000 })
    expect(totalGs(pedido)).toBe(31000)
    expect(itemsParaVenta(pedido)).toEqual([{ producto_id: '1', cantidad: 2 }, { producto_id: '2', cantidad: 1 }])
  })
  it('no modifica el pedido de entrada al agregar o quitar', () => {
    const pedido = agregar([], producto)
    const original = structuredClone(pedido)
    agregar(pedido, producto)
    quitar(pedido, producto.id)
    expect(pedido).toEqual(original)
  })
  it('conserva el pedido al quitar un producto ausente', () => {
    const pedido = agregar([], producto)
    expect(quitar(pedido, 'ausente')).toEqual(pedido)
  })
})
