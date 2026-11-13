
interface SpinnerProps {
  size?: number
  color?: string
}

export default function Spinner({ size = 24, color = '#6366f1' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="carregando"
      style={{
        display: 'inline-block',
        width: size,
        height: size,
        borderRadius: '50%',
        border: `3px solid rgba(255,255,255,0.1)`,
        borderTopColor: color,
        animation: 'spin 0.6s linear infinite',
        flexShrink: 0,
      }}
    />
  )
}
