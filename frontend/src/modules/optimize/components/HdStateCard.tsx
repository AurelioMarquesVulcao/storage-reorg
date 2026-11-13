import type { HdStateEntry } from '../services/optimizeService'
import Card from '../../../shared/ui/Card'
import ProgressBar from '../../../shared/ui/ProgressBar'

interface HdStateCardProps {
  entries: HdStateEntry[]
}

function usePctColor(pct: number): string {
  if (pct >= 90) return '#ef4444'
  if (pct >= 75) return '#f97316'
  if (pct >= 60) return '#facc15'
  return '#4ade80'
}

function HdRow({ entry }: { entry: HdStateEntry }) {
  const label = entry.mount.replace('/mnt/', '')
  const delta = entry.projected_use_pct - entry.current_use_pct
  const deltaStr = delta < 0 ? `${delta.toFixed(0)}%` : `+${delta.toFixed(0)}%`
  const deltaColor = delta < 0 ? '#4ade80' : delta > 0 ? '#f97171' : '#64748b'

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#94a3b8' }}>{label}</span>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: '#4a5568' }}>
            atual: <strong style={{ color: '#94a3b8' }}>{entry.current_use_pct.toFixed(0)}%</strong>
          </span>
          {delta !== 0 && (
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              projetado: <strong style={{ color: '#94a3b8' }}>{entry.projected_use_pct.toFixed(0)}%</strong>
            </span>
          )}
          {delta !== 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, color: deltaColor }}>{deltaStr}</span>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <ProgressBar pct={entry.current_use_pct} color={usePctColor(entry.current_use_pct)} height={6} />
        {delta !== 0 && (
          <ProgressBar
            pct={entry.projected_use_pct}
            color={usePctColor(entry.projected_use_pct)}
            height={4}
          />
        )}
      </div>
    </div>
  )
}

export default function HdStateCard({ entries }: HdStateCardProps) {
  if (entries.length === 0) return null
  return (
    <Card style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 16 }}>
        Estado dos HDs (atual / projetado após aprovações)
      </div>
      {entries.map((e) => (
        <HdRow key={e.mount} entry={e} />
      ))}
    </Card>
  )
}
