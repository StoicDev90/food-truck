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
