import React from 'react'

type BadgeVariant = 'default' | 'success' | 'danger' | 'warning' | 'info' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  style?: React.CSSProperties
}

const variants: Record<BadgeVariant, React.CSSProperties> = {
  default: { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc' },
  success: { background: 'rgba(34,197,94,0.15)', color: '#4ade80' },
  danger: { background: 'rgba(239,68,68,0.15)', color: '#f87171' },
  warning: { background: 'rgba(234,179,8,0.15)', color: '#facc15' },
  info: { background: 'rgba(56,189,248,0.15)', color: '#38bdf8' },
  muted: { background: 'rgba(148,163,184,0.1)', color: '#64748b' },
}

export default function Badge({ variant = 'default', children, style }: BadgeProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: '0.3px',
        ...variants[variant],
        ...style,
      }}
    >
      {children}
    </span>
  )
}
