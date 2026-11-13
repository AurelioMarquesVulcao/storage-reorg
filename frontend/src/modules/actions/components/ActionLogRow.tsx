import type { ActionLog } from '../../../shared/types'
import Badge from '../../../shared/ui/Badge'
import { Trash2, MoveRight } from 'lucide-react'

interface ActionLogRowProps {
  item: ActionLog
}

function formatDate(ts: string) {
  return new Date(ts).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ActionLogRow({ item }: ActionLogRowProps) {
  const pathShort = item.path.length > 60 ? '…' + item.path.slice(-57) : item.path
  const hdLabel = item.hd.replace('/mnt/', '')

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '28px 1fr 90px 90px 80px 90px',
        alignItems: 'center',
        gap: 12,
        padding: '11px 16px',
        borderBottom: '1px solid #1a1f2e',
        fontSize: 13,
      }}
    >
      {/* Type icon */}
      <div style={{ color: item.type === 'delete' ? '#f87171' : '#38bdf8', display: 'flex' }}>
        {item.type === 'delete' ? <Trash2 size={15} /> : <MoveRight size={15} />}
      </div>

      {/* Path */}
      <div style={{ overflow: 'hidden' }}>
        <div
          style={{
            color: '#94a3b8',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {pathShort}
        </div>
        {item.error_msg && (
          <div style={{ fontSize: 11, color: '#f87171', marginTop: 2 }}>{item.error_msg}</div>
        )}
      </div>

      {/* HD */}
      <div style={{ fontSize: 12, color: '#4a5568', textAlign: 'right' }}>{hdLabel}</div>

      {/* Size */}
      <div style={{ color: '#64748b', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
        {item.size_human}
      </div>

      {/* Status */}
      <div>
        <Badge variant={item.status === 'success' ? 'success' : 'danger'}>
          {item.status === 'success' ? 'sucesso' : 'erro'}
        </Badge>
      </div>

      {/* Timestamp */}
      <div style={{ fontSize: 11, color: '#374151', textAlign: 'right' }}>
        {formatDate(item.timestamp)}
      </div>
    </div>
  )
}
