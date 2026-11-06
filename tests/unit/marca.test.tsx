import { expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Sticker } from '@/components/marca/Sticker'

it('muestra el sticker accesible con los textos de la marca', () => {
  render(<Sticker />)
  const logo = screen.getByRole('img', { name: 'Oasis Itaipu' })
  expect(logo.textContent).toContain('OASIS ITAIPU')
  expect(logo.textContent).toContain('PARQUE TACURÚ PUCÚ')
})
