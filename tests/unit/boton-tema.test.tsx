import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { BotonTema } from '@/components/tema/BotonTema'

afterEach(() => { cleanup(); localStorage.clear(); document.documentElement.classList.remove('dark'); history.replaceState(null, '', '/') })

it('alterna y guarda el tema del personal', () => {
  document.documentElement.classList.remove('dark')
  history.replaceState(null, '', '/pos')
  render(<BotonTema />)
  fireEvent.click(screen.getByRole('button', { name: 'Cambiar a modo oscuro' }))
  expect(document.documentElement.classList.contains('dark')).toBe(true)
  expect(localStorage.getItem('tema-staff')).toBe('oscuro')
  expect(screen.getByRole('button', { name: 'Cambiar a modo claro' })).toBeTruthy()
  expect(localStorage.getItem('tema-menu')).toBeNull()
})
