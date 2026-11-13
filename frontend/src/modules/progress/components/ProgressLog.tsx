import { useRef, useEffect } from 'react'

interface LogEntry {
  message: string
  status: 'success' | 'error'
}

interface ProgressLogProps {
  logs: LogEntry[]
}

export default function ProgressLog({ logs }: ProgressLogProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (bottomRef.current && typeof bottomRef.current.scrollIntoView === 'function') {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs.length])

  if (logs.length === 0) {
    return (
      <div
        style={{
          background: '#0a0c12',
          border: '1px solid #1e2130',
          borderRadius: 10,
          padding: 16,
          minHeight: 120,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 13,
          color: '#374151',
        }}
      >
        O log de operações aparecerá aqui durante a execução.
      </div>
    )
  }

  return (
    <div
      style={{
        background: '#0a0c12',
        border: '1px solid #1e2130',
        borderRadius: 10,
        padding: 12,
        maxHeight: 320,
        overflowY: 'auto',
        fontFamily: 'monospace',
        fontSize: 12,
      }}
    >
      {logs.map((entry, i) => (
        <div
          key={i}
          style={{
            color: entry.status === 'error' ? '#f87171' : '#4ade80',
            padding: '2px 0',
            lineHeight: 1.5,
          }}
        >
          {entry.status === 'error' ? '✗ ' : '✓ '}
          {entry.message}
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
