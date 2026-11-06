import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { PestanasMenu } from '@/components/menu/PestanasMenu'

afterEach(cleanup)

it('mantiene la pestaña elegida durante el desplazamiento programático', () => {
  render(<><PestanasMenu secciones={[{ id: 'a', nombre: 'Comidas', productos: [] }, { id: 'b', nombre: 'Bebidas', productos: [] }]} /><section id="cat-a" /><section id="cat-b" /></>)
  document.getElementById('cat-b')!.getBoundingClientRect = () => ({ top: 300 } as DOMRect)
  fireEvent.click(screen.getByRole('link', { name: 'Bebidas' }))
  expect(screen.getByRole('link', { name: 'Bebidas' })).toHaveAttribute('aria-current', 'true')
  fireEvent.scroll(window)
  expect(screen.getByRole('link', { name: 'Bebidas' })).toHaveAttribute('aria-current', 'true')
})
