import { useOptimize } from '../hooks/useOptimize'
import ProposalRow from '../components/ProposalRow'
import HdStateCard from '../components/HdStateCard'
import { Button, Card, Spinner } from '../../../shared/ui'
import { useToast } from '../../../shared/ui/Toast'

const STATUS_OPTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'moved', label: 'Movido' },
  { value: 'error', label: 'Erro' },
]

export default function OptimizePage() {
  const {
    items,
    hdState,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    approve,
    skip,
    reload,
    nextPage,
    prevPage,
  } = useOptimize()

  const { showToast } = useToast()

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
      showToast('Movimentação aprovada', 'success')
    } catch {
      showToast('Erro ao aprovar movimentação', 'error')
    }
  }

  const handleSkip = async (id: string) => {
    try {
      await skip(id)
      showToast('Proposta ignorada', 'info')
    } catch {
      showToast('Erro ao ignorar proposta', 'error')
    }
  }

  const approvedCount = items.filter((i) => i.status === 'approved').length
  const pendingCount = items.filter((i) => i.status === 'pending').length

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            Otimização
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Propostas de reorganização de pastas entre discos para balancear uso e liberar espaço.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
          ↻ Recarregar
        </Button>
      </div>

      {/* HD State */}
      {hdState.length > 0 && <HdStateCard entries={hdState} />}

      {/* Stats strip */}
      {total > 0 && (
        <div
          style={{
            display: 'flex',
            gap: 24,
            marginBottom: 20,
            fontSize: 13,
            color: '#4a5568',
          }}
        >
          <span><strong style={{ color: '#e2e8f0' }}>{total}</strong> propostas</span>
          <span><strong style={{ color: '#facc15' }}>{pendingCount}</strong> pendentes</span>
          <span><strong style={{ color: '#4ade80' }}>{approvedCount}</strong> aprovadas</span>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {STATUS_OPTIONS.map((opt) => (
          <button
            key={String(opt.value)}
            onClick={() => setStatusFilter(opt.value)}
            style={{
              padding: '5px 14px',
              borderRadius: 20,
              fontSize: 12,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: statusFilter === opt.value ? '#6366f1' : '#1e2130',
              color: statusFilter === opt.value ? '#fff' : '#64748b',
              transition: 'background 0.15s',
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <Card
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            marginBottom: 16,
          }}
        >
          <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
        </Card>
      )}

      {/* Table */}
      <Card padding={0}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 100px 150px 90px auto',
            gap: 12,
            padding: '10px 16px',
            borderBottom: '1px solid #1e2130',
            fontSize: 11,
            fontWeight: 700,
            color: '#374151',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
          }}
        >
          <span>Pasta</span>
          <span style={{ textAlign: 'right' }}>Tamanho</span>
          <span>Rota</span>
          <span>Status</span>
          <span />
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#374151', fontSize: 14 }}>
            Nenhuma proposta encontrada.
          </div>
        )}

        {!loading &&
          items.map((item) => (
            <ProposalRow key={item.id} item={item} onApprove={handleApprove} onSkip={handleSkip} />
          ))}
      </Card>

      {/* Pagination */}
      {total > limit && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
            fontSize: 13,
            color: '#4a5568',
          }}
        >
          <span>
            {offset + 1}–{Math.min(offset + limit, total)} de {total}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button size="sm" variant="secondary" onClick={prevPage} disabled={offset === 0}>
              ← Anterior
            </Button>
            <Button size="sm" variant="secondary" onClick={nextPage} disabled={offset + limit >= total}>
              Próximo →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
