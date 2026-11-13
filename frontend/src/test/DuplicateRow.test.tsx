import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DuplicateRow from '../modules/duplicates/components/DuplicateRow'

const fakeItem = {
  id: 'dup-1',
  filename: 'Filme.mkv',
  size_bytes: 4294967296,
  size_human: '4.0 GB',
  master_path: '/mnt/dados/Filmes/Filme.mkv',
  master_hd: '/mnt/dados',
  copies: [{ path: '/mnt/aurelio-yasmin/Filmes/Filme.mkv', hd: '/mnt/aurelio-yasmin' }],
  approved: false,
  status: 'pending' as const,
}

describe('DuplicateRow', () => {
  it('renders filename and size', () => {
    render(<DuplicateRow item={fakeItem} onApprove={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Filme.mkv')).toBeInTheDocument()
    expect(screen.getByText('4.0 GB')).toBeInTheDocument()
  })

  it('shows pending status badge', () => {
    render(<DuplicateRow item={fakeItem} onApprove={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('pendente')).toBeInTheDocument()
  })

  it('shows action buttons when pending', () => {
    render(<DuplicateRow item={fakeItem} onApprove={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.getByText('Deletar')).toBeInTheDocument()
    expect(screen.getByText('Ignorar')).toBeInTheDocument()
  })

  it('calls onApprove when Deletar is clicked', async () => {
    const onApprove = vi.fn().mockResolvedValue(undefined)
    render(<DuplicateRow item={fakeItem} onApprove={onApprove} onSkip={vi.fn()} />)
    fireEvent.click(screen.getByText('Deletar'))
    expect(onApprove).toHaveBeenCalledWith('dup-1')
  })

  it('calls onSkip when Ignorar is clicked', async () => {
    const onSkip = vi.fn().mockResolvedValue(undefined)
    render(<DuplicateRow item={fakeItem} onApprove={vi.fn()} onSkip={onSkip} />)
    fireEvent.click(screen.getByText('Ignorar'))
    expect(onSkip).toHaveBeenCalledWith('dup-1')
  })

  it('hides action buttons when status is not pending', () => {
    const skippedItem = { ...fakeItem, status: 'skipped' as const }
    render(<DuplicateRow item={skippedItem} onApprove={vi.fn()} onSkip={vi.fn()} />)
    expect(screen.queryByText('Deletar')).not.toBeInTheDocument()
    expect(screen.queryByText('Ignorar')).not.toBeInTheDocument()
    expect(screen.getByText('ignorado')).toBeInTheDocument()
  })
})
