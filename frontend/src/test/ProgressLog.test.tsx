import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ProgressLog from '../modules/progress/components/ProgressLog'

describe('ProgressLog', () => {
  it('shows placeholder when empty', () => {
    render(<ProgressLog logs={[]} />)
    expect(screen.getByText(/log de operações aparecerá/i)).toBeInTheDocument()
  })

  it('renders success log entries', () => {
    const logs = [{ message: 'Deleted: Filme.mkv (4.0 GB)', status: 'success' as const }]
    render(<ProgressLog logs={logs} />)
    expect(screen.getByText(/Deleted: Filme\.mkv/)).toBeInTheDocument()
  })

  it('renders error log entries', () => {
    const logs = [{ message: 'Permission denied: /mnt/1tera/Filme.mkv', status: 'error' as const }]
    render(<ProgressLog logs={logs} />)
    expect(screen.getByText(/Permission denied/)).toBeInTheDocument()
  })

  it('renders multiple entries', () => {
    const logs = [
      { message: 'Deleted: A.mkv', status: 'success' as const },
      { message: 'Error: B.mkv', status: 'error' as const },
    ]
    render(<ProgressLog logs={logs} />)
    expect(screen.getByText(/Deleted: A\.mkv/)).toBeInTheDocument()
    expect(screen.getByText(/Error: B\.mkv/)).toBeInTheDocument()
  })
})
