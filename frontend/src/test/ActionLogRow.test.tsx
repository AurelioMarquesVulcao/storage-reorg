import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ActionLogRow from '../modules/actions/components/ActionLogRow'

const fakeLog = {
  id: 'log-1',
  type: 'delete' as const,
  path: '/mnt/aurelio-yasmin/Filmes/Filme.mkv',
  size_bytes: 4294967296,
  size_human: '4.0 GB',
  hd: '/mnt/aurelio-yasmin',
  timestamp: '2026-11-13T12:00:00Z',
  status: 'success' as const,
  error_msg: undefined,
}

describe('ActionLogRow', () => {
  it('renders path and size', () => {
    render(<ActionLogRow item={fakeLog} />)
    // path appears in full, size in its own cell
    expect(screen.getAllByText(/aurelio-yasmin/).length).toBeGreaterThan(0)
    expect(screen.getByText('4.0 GB')).toBeInTheDocument()
  })

  it('shows success badge', () => {
    render(<ActionLogRow item={fakeLog} />)
    expect(screen.getByText('sucesso')).toBeInTheDocument()
  })

  it('shows error badge for error status', () => {
    const errLog = { ...fakeLog, status: 'error' as const, error_msg: 'Permission denied' }
    render(<ActionLogRow item={errLog} />)
    expect(screen.getByText('erro')).toBeInTheDocument()
    expect(screen.getByText('Permission denied')).toBeInTheDocument()
  })

  it('shows HD label without /mnt/ prefix', () => {
    render(<ActionLogRow item={fakeLog} />)
    expect(screen.getByText('aurelio-yasmin')).toBeInTheDocument()
  })

  it('renders move type correctly', () => {
    const moveLog = { ...fakeLog, type: 'move' as const }
    const { container } = render(<ActionLogRow item={moveLog} />)
    // move icon wrapper uses color rgb(56, 189, 248) = #38bdf8
    const iconWrapper = container.querySelector('[style*="56, 189, 248"]')
    expect(iconWrapper).not.toBeNull()
  })
})
