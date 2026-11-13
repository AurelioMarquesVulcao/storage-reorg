import React from 'react'
import type { MoveProposal } from '../../../shared/types'
import { Badge, Button } from '../../../shared/ui'

interface ProposalRowProps {
  item: MoveProposal
  onApprove: (id: string) => Promise<void>
  onSkip: (id: string) => Promise<void>
}

function statusVariant(status: MoveProposal['status']) {
  switch (status) {
    case 'approved': return 'success'
    case 'moved':    return 'info'
    case 'error':    return 'danger'
    default:         return 'warning'
  }
}

function statusLabel(status: MoveProposal['status']) {
  switch (status) {
    case 'approved': return 'aprovado'
    case 'moved':    return 'movido'
    case 'error':    return 'erro'
    default:         return 'pendente'
  }
}

export default function ProposalRow({ item, onApprove, onSkip }: ProposalRowProps) {
  const [loading, setLoading] = React.useState(false)
  const isPending = item.status === 'pending'

  const handle = async (action: () => Promise<void>) => {
    setLoading(true)
    try { await action() } finally { setLoading(false) }
  }

  const fromLabel = item.from_hd.replace('/mnt/', '')
  const toLabel = item.to_hd.replace('/mnt/', '')
  const folderShort = item.folder.length > 50 ? '…' + item.folder.slice(-47) : item.folder

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 100px 150px 90px auto',
        alignItems: 'center',
        gap: 12,
        padding: '12px 16px',
        borderBottom: '1px solid #1a1f2e',
        fontSize: 13,
      }}
    >
      {/* Folder */}
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
          {folderShort}
        </div>
        <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{item.reason}</div>
      </div>

      {/* Size */}
      <div style={{ color: '#94a3b8', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {item.size_human}
      </div>

      {/* Route */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#64748b' }}>
        <span style={{ color: '#f97316', fontWeight: 600 }}>{fromLabel}</span>
        <span>→</span>
        <span style={{ color: '#4ade80', fontWeight: 600 }}>{toLabel}</span>
      </div>

      {/* Status */}
      <div>
        <Badge variant={statusVariant(item.status)}>{statusLabel(item.status)}</Badge>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
        {isPending && (
          <>
            <Button size="sm" variant="primary" loading={loading} onClick={() => handle(() => onApprove(item.id))}>
              Aprovar
            </Button>
            <Button size="sm" variant="ghost" loading={loading} onClick={() => handle(() => onSkip(item.id))}>
              Ignorar
            </Button>
          </>
        )}
        {!isPending && <span style={{ fontSize: 12, color: '#374151' }}>—</span>}
      </div>
    </div>
  )
}
