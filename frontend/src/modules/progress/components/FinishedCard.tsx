import type { DoneEvent } from '../services/progressService'
import { AnimatedCheck } from '../../../shared/ui'
import Card from '../../../shared/ui/Card'

interface FinishedCardProps {
  result: DoneEvent
}

export default function FinishedCard({ result }: FinishedCardProps) {
  return (
    <Card
      style={{
        border: '1px solid rgba(74,222,128,0.2)',
        background: 'rgba(34,197,94,0.05)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        padding: '32px 24px',
        textAlign: 'center',
      }}
    >
      <AnimatedCheck size={56} />
      <div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
          Execução concluída!
        </div>
        <div style={{ fontSize: 14, color: '#64748b' }}>
          {result.total_deleted} arquivo(s) deletado(s) · {result.total_moved} pasta(s) movida(s) ·{' '}
          <strong style={{ color: '#a5b4fc' }}>{result.freed_human}</strong> liberado(s)
        </div>
      </div>
    </Card>
  )
}
