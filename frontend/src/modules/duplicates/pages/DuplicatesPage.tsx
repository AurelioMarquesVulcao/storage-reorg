import { useDuplicates } from '../hooks/useDuplicates'
import DuplicateRow from '../components/DuplicateRow'
import DuplicateSummaryCard from '../components/DuplicateSummaryCard'
import { Button, Card, Spinner } from '../../../shared/ui'
import { useToast } from '../../../shared/ui/Toast'

const STATUS_OPTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'approved', label: 'Aprovado' },
  { value: 'deleted', label: 'Deletado' },
  { value: 'skipped', label: 'Ignorado' },
]

export default function DuplicatesPage() {
  const {
    items,
    summary,
    total,
    loading,
    error,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    approve,
    skip,
    approveAll,
    reload,
    nextPage,
    prevPage,
  } = useDuplicates()

  const { showToast } = useToast()

  const handleApprove = async (id: string) => {
    try {
      await approve(id)
      showToast('Duplicata aprovada para deleção', 'success')
    } catch {
      showToast('Erro ao aprovar duplicata', 'error')
    }
  }

  const handleSkip = async (id: string) => {
    try {
      await skip(id)
      showToast('Duplicata ignorada', 'info')
    } catch {
      showToast('Erro ao ignorar duplicata', 'error')
    }
  }

  const handleApproveAll = async () => {
    try {
      await approveAll()
      showToast('Todas as duplicatas pendentes foram aprovadas', 'success')
    } catch {
      showToast('Erro ao aprovar todas', 'error')
    }
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            Duplicatas
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Detecte arquivos duplicados entre os HDs e aprove a remoção das cópias desnecessárias.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
            ↻ Recarregar
          </Button>
          <Button variant="danger" size="sm" onClick={handleApproveAll} disabled={loading || summary?.pending === 0}>
            Aprovar Todos
          </Button>
        </div>
      </div>

      {/* Summary */}
      {summary && <DuplicateSummaryCard summary={summary} />}

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
        <Card style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', marginBottom: 16 }}>
          <p style={{ color: '#f87171', fontSize: 13 }}>{error}</p>
        </Card>
      )}

      {/* Table */}
      <Card padding={0}>
        {/* Table header */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 90px 110px auto',
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
          <span>Arquivo</span>
          <span style={{ textAlign: 'right' }}>Tamanho</span>
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
            Nenhuma duplicata encontrada.
          </div>
        )}

        {!loading &&
          items.map((item) => (
            <DuplicateRow key={item.id} item={item} onApprove={handleApprove} onSkip={handleSkip} />
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
