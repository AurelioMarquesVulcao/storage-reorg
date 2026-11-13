import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FinishedCard from '../modules/progress/components/FinishedCard'

const result = {
  type: 'done' as const,
  total_deleted: 48,
  total_moved: 10,
  freed_bytes: 128849018880,
  freed_human: '120 GB',
}

describe('FinishedCard', () => {
  it('renders completion message', () => {
    render(<FinishedCard result={result} />)
    expect(screen.getByText(/execução concluída/i)).toBeInTheDocument()
  })

  it('shows freed space', () => {
    render(<FinishedCard result={result} />)
    expect(screen.getByText(/120 GB/)).toBeInTheDocument()
  })

  it('shows deleted and moved counts', () => {
    render(<FinishedCard result={result} />)
    expect(screen.getByText(/48 arquivo/)).toBeInTheDocument()
    expect(screen.getByText(/10 pasta/)).toBeInTheDocument()
  })

  it('renders animated check icon', () => {
    render(<FinishedCard result={result} />)
    expect(screen.getByLabelText('concluído')).toBeInTheDocument()
  })
})
