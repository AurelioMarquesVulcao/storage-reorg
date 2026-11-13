import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Modal from '../shared/ui/Modal'

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    render(<Modal open={false} onClose={() => undefined} title="Test"><p>conteúdo</p></Modal>)
    expect(screen.queryByText('conteúdo')).not.toBeInTheDocument()
  })

  it('renders children when open=true', () => {
    render(<Modal open onClose={() => undefined} title="Meu Modal"><p>conteúdo</p></Modal>)
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(screen.getByText('Meu Modal')).toBeInTheDocument()
  })

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn()
    render(<Modal open onClose={onClose} title="Fechar"><p>x</p></Modal>)
    fireEvent.click(screen.getByRole('button', { name: 'fechar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    const { container } = render(<Modal open onClose={onClose} title="Backdrop"><p>y</p></Modal>)
    const backdrop = container.querySelector('[role="dialog"]') as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledOnce()
  })
})
