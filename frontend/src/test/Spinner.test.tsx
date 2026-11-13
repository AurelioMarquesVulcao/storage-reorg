import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Spinner from '../shared/ui/Spinner'

describe('Spinner', () => {
  it('renders with accessible label', () => {
    render(<Spinner />)
    expect(screen.getByRole('status', { name: 'carregando' })).toBeInTheDocument()
  })

  it('applies custom size', () => {
    render(<Spinner size={32} />)
    const el = screen.getByRole('status')
    expect(el).toHaveStyle({ width: '32px', height: '32px' })
  })
})
