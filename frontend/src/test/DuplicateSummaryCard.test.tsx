import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DuplicateSummaryCard from '../modules/duplicates/components/DuplicateSummaryCard'

const summary = {
  total: 142,
  pending: 100,
  approved: 40,
  deleted: 2,
  skipped: 0,
  total_wasted_bytes: 128849018880,
  total_wasted_human: '120 GB',
}

describe('DuplicateSummaryCard', () => {
  it('renders all summary stats', () => {
    render(<DuplicateSummaryCard summary={summary} />)
    expect(screen.getByText('142')).toBeInTheDocument()
    expect(screen.getByText('100')).toBeInTheDocument()
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('0')).toBeInTheDocument()
    expect(screen.getByText('120 GB')).toBeInTheDocument()
  })
})
