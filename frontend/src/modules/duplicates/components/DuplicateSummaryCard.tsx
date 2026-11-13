import type { DuplicateSummary } from '../services/duplicatesService'
import Card from '../../../shared/ui/Card'

interface DuplicateSummaryCardProps {
  summary: DuplicateSummary
}

function Stat({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color ?? '#e2e8f0' }}>{value}</div>
      <div style={{ fontSize: 11, color: '#4a5568', marginTop: 2 }}>{label}</div>
    </div>
  )
}

export default function DuplicateSummaryCard({ summary }: DuplicateSummaryCardProps) {
  return (
    <Card style={{ marginBottom: 24 }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
          gap: 16,
        }}
      >
        <Stat label="total" value={summary.total} />
        <Stat label="pendente" value={summary.pending} color="#facc15" />
        <Stat label="aprovado" value={summary.approved} color="#4ade80" />
        <Stat label="deletado" value={summary.deleted} color="#38bdf8" />
        <Stat label="ignorado" value={summary.skipped} color="#64748b" />
        <Stat label="a liberar" value={summary.total_wasted_human} color="#a5b4fc" />
      </div>
    </Card>
  )
}
