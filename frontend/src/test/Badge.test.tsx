import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Badge from '../shared/ui/Badge'

describe('Badge', () => {
  it('renders children', () => {
    render(<Badge>pendente</Badge>)
    expect(screen.getByText('pendente')).toBeInTheDocument()
  })

  it('applies success variant style', () => {
    render(<Badge variant="success">ok</Badge>)
    const el = screen.getByText('ok')
    expect(el).toHaveStyle({ color: '#4ade80' })
  })

  it('applies danger variant style', () => {
    render(<Badge variant="danger">erro</Badge>)
    const el = screen.getByText('erro')
    expect(el).toHaveStyle({ color: '#f87171' })
  })

  it('defaults to default variant', () => {
    render(<Badge>padrão</Badge>)
    const el = screen.getByText('padrão')
    expect(el).toHaveStyle({ color: '#a5b4fc' })
  })
})
