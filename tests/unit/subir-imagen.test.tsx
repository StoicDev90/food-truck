import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

const m = vi.hoisted(() => ({ upload: vi.fn(), achicar: vi.fn(), from: vi.fn() }))
vi.mock('@/lib/imagenes-navegador', () => ({ achicarImagen: m.achicar }))
vi.mock('@/lib/supabase/client', () => ({ crearClienteNavegador: () => ({ storage: { from: m.from } }) }))
import { SubirImagen } from '@/components/admin/SubirImagen'

afterEach(() => { cleanup(); vi.resetAllMocks() })

it('sube el resultado WebP con extensión webp', async () => {
  const original = new File(['foto'], 'foto.png', { type: 'image/png' })
  const webp = new Blob(['reducida'], { type: 'image/webp' })
  const onChange = vi.fn()
  m.achicar.mockResolvedValue(webp)
  m.from.mockReturnValue({ upload: m.upload })
  m.upload.mockResolvedValue({ error: null })
  render(<SubirImagen carpeta="productos" valor={null} onChange={onChange} />)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [original] } })
  await waitFor(() => expect(onChange).toHaveBeenCalledOnce())
  expect(m.achicar).toHaveBeenCalledWith(original)
  expect(m.from).toHaveBeenCalledWith('imagenes')
  expect(m.upload).toHaveBeenCalledWith(expect.stringMatching(/^productos\/[\w-]+\.webp$/), webp)
  expect(onChange).toHaveBeenCalledWith(m.upload.mock.calls[0][0])
})

it('comprime un PNG de 3 MB antes de subirlo', async () => {
  const original = new File([new Uint8Array(3 * 1024 * 1024)], 'foto.png', { type: 'image/png' })
  const webp = new Blob(['pequeña'], { type: 'image/webp' })
  m.achicar.mockResolvedValue(webp)
  m.from.mockReturnValue({ upload: m.upload })
  m.upload.mockResolvedValue({ error: null })
  render(<SubirImagen carpeta="marca" valor={null} onChange={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [original] } })
  await waitFor(() => expect(m.upload).toHaveBeenCalledWith(expect.stringMatching(/^marca\/[\w-]+\.webp$/), webp))
})

it('rechaza el resultado si sigue superando 2 MB', async () => {
  m.achicar.mockResolvedValue(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: 'image/webp' }))
  render(<SubirImagen carpeta="marca" valor={null} onChange={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [new File(['foto'], 'foto.png', { type: 'image/png' })] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Elegí una imagen JPEG, PNG o WebP de hasta 2 MB.')
  expect(m.upload).not.toHaveBeenCalled()
})

it('rechaza otros tipos sin comprimir', async () => {
  render(<SubirImagen carpeta="marca" valor={null} onChange={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('Foto'), { target: { files: [new File(['texto'], 'foto.txt', { type: 'text/plain' })] } })
  expect(await screen.findByRole('alert')).toHaveTextContent('Elegí una imagen JPEG, PNG o WebP de hasta 2 MB.')
  expect(m.achicar).not.toHaveBeenCalled()
  expect(m.upload).not.toHaveBeenCalled()
})
