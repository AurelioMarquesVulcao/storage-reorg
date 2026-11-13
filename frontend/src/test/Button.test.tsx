import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Button from '../shared/ui/Button'

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Clique</Button>)
    expect(screen.getByText('Clique')).toBeInTheDocument()
  })

  it('calls onClick', () => {
    const handler = vi.fn()
    render(<Button onClick={handler}>OK</Button>)
    fireEvent.click(screen.getByText('OK'))
    expect(handler).toHaveBeenCalledOnce()
  })

  it('is disabled when loading=true', () => {
    render(<Button loading>Aguarde</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('is disabled when disabled=true', () => {
    render(<Button disabled>Desabilitado</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })

  it('does not call onClick when disabled', () => {
    const handler = vi.fn()
    render(<Button disabled onClick={handler}>Desabilitado</Button>)
    fireEvent.click(screen.getByText('Desabilitado'))
    expect(handler).not.toHaveBeenCalled()
  })
})
