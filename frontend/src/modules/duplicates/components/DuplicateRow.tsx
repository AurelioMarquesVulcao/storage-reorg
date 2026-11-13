import React from 'react'
import type { DuplicateFile } from '../../../shared/types'
import { Badge, Button } from '../../../shared/ui'

interface DuplicateRowProps {
  item: DuplicateFile
  onApprove: (id: string) => Promise<void>
  onSkip: (id: string) => Promise<void>
}

function statusVariant(status: DuplicateFile['status']) {
  switch (status) {
    case 'approved': return 'success'
    case 'deleted':  return 'info'
    case 'skipped':  return 'muted'
    case 'error':    return 'danger'
    default:         return 'warning'
  }
}

function statusLabel(status: DuplicateFile['status']) {
  switch (status) {
    case 'approved': return 'aprovado'
    case 'deleted':  return 'deletado'
    case 'skipped':  return 'ignorado'
    case 'error':    return 'erro'
    default:         return 'pendente'
  }
}

export default function DuplicateRow({ item, onApprove, onSkip }: DuplicateRowProps) {
  const [loading, setLoading] = React.useState(false)

  const handle = async (action: () => Promise<void>) => {
    setLoading(true)
    try { await action() } finally { setLoading(false) }
  }

  const isPending = item.status === 'pending'

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 90px 110px auto',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #1a1f2e',
        fontSize: 13,
      }}
    >
      {/* File info */}
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            fontWeight: 600,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {item.filename}
        </div>
        <div
          style={{
            fontSize: 11,
            color: '#4a5568',
            marginTop: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          master: {item.master_path}
        </div>
        <div style={{ fontSize: 11, color: '#374151', marginTop: 2 }}>
          {item.copies.length} {item.copies.length === 1 ? 'cópia' : 'cópias'} em:{' '}
          {item.copies.map((c) => c.hd.replace('/mnt/', '')).join(', ')}
        </div>
      </div>

      {/* Size */}
      <div style={{ color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {item.size_human}
      </div>

      {/* Status */}
      <div>
        <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {isPending && (
          <>
            <Button size="sm" variant="danger" loading={loading} onClick={() => handle(() => onApprove(item.id))}>
              Deletar
            </Button>
            <Button size="sm" variant="ghost" loading={loading} onClick={() => handle(() => onSkip(item.id))}>
              Ignorar
            </Button>
          </>
        )}
        {!isPending && (
          <span style={{ fontSize: 12, color: '#374151' }}>—</span>
        )}
      </div>
    </div>
  )
}
