import { randomUUID } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { admin, anon, crearUsuario } from './helpers'

describe('bucket imagenes', () => {
  it('permite escritura al dueño y lectura pública, y restringe empleados y MIME', async () => {
    const dueno = await crearUsuario('dueno')
    const empleado = await crearUsuario('empleado')
    const path = `productos/${randomUUID()}.png`
    const archivo = new Uint8Array([137, 80, 78, 71])
    try {
      expect((await dueno.client.storage.from('imagenes').upload(path, archivo, { contentType: 'image/png' })).error).toBeNull()
      expect((await empleado.client.storage.from('imagenes').upload(`productos/${randomUUID()}.png`, archivo, { contentType: 'image/png' })).error).not.toBeNull()
      expect((await dueno.client.storage.from('imagenes').upload(`productos/${randomUUID()}.txt`, archivo, { contentType: 'text/plain' })).error).not.toBeNull()
      const url = anon.storage.from('imagenes').getPublicUrl(path).data.publicUrl
      expect((await fetch(url)).status).toBe(200)
      expect((await empleado.client.storage.from('imagenes').update(path, archivo, { contentType: 'image/png' })).error).not.toBeNull()
      await empleado.client.storage.from('imagenes').remove([path])
      expect((await fetch(url)).status).toBe(200)
    } finally {
      await admin.storage.from('imagenes').remove([path])
    }
  })
})
