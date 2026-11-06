import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import LoginPos from '@/app/pos/login/page'

vi.mock('@/lib/auth/acciones', () => ({ loginEmpleado: vi.fn() }))

afterEach(cleanup)

it('da a los campos del POS un área táctil de al menos 44 px', () => {
  render(<LoginPos />)
  expect(screen.getByLabelText('Usuario')).toHaveClass('min-h-11')
  expect(screen.getByLabelText('PIN')).toHaveClass('min-h-11')
})
