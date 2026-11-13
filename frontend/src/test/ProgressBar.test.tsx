import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import ProgressBar from '../shared/ui/ProgressBar'

describe('ProgressBar', () => {
  it('renders with aria attributes', () => {
    const { container } = render(<ProgressBar pct={42} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).not.toBeNull()
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps pct below 0 to 0', () => {
    const { container } = render(<ProgressBar pct={-10} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toHaveAttribute('aria-valuenow', '0')
  })

  it('clamps pct above 100 to 100', () => {
    const { container } = render(<ProgressBar pct={150} />)
    const bar = container.querySelector('[role="progressbar"]')
    expect(bar).toHaveAttribute('aria-valuenow', '100')
  })

  it('shows label when showLabel=true', () => {
    const { getByText } = render(<ProgressBar pct={55} showLabel />)
    expect(getByText('55%')).toBeInTheDocument()
  })
})
