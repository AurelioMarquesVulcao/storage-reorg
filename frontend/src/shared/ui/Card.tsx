import React from 'react'

interface CardProps {
  children: React.ReactNode
  style?: React.CSSProperties
  className?: string
  padding?: number | string
}

export default function Card({ children, style, padding = '20px' }: CardProps) {
  return (
    <div
      style={{
        background: '#151822',
        border: '1px solid #1e2130',
        borderRadius: 12,
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  )
}
