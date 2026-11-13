
interface ProgressBarProps {
  pct: number          // 0–100
  color?: string
  height?: number
  showLabel?: boolean
  animated?: boolean
}

export default function ProgressBar({
  pct,
  color = '#6366f1',
  height = 8,
  showLabel = false,
  animated = false,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          flex: 1,
          height,
          background: '#1e2130',
          borderRadius: height,
          overflow: 'hidden',
        }}
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          style={{
            height: '100%',
            width: `${clamped}%`,
            background: color,
            borderRadius: height,
            transition: animated ? 'none' : 'width 0.3s ease',
            backgroundImage: animated
              ? `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 8px,
                  rgba(255,255,255,0.08) 8px,
                  rgba(255,255,255,0.08) 16px
                )`
              : undefined,
            animation: animated ? 'stripes 0.8s linear infinite' : undefined,
          }}
        />
      </div>
      {showLabel && (
        <span style={{ fontSize: 12, color: '#64748b', minWidth: 36, textAlign: 'right' }}>
          {clamped.toFixed(0)}%
        </span>
      )}
    </div>
  )
}
