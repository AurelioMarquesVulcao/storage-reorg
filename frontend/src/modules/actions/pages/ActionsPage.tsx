import React from 'react'
import { useActions } from '../hooks/useActions'
import ActionLogRow from '../components/ActionLogRow'
import { Button, Card, Spinner } from '../../../shared/ui'
import { useToast } from '../../../shared/ui/Toast'
import { actionsService } from '../services/actionsService'
import { useNavigate } from 'react-router-dom'

const TYPE_OPTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'delete' as const, label: 'Deleção' },
  { value: 'move' as const, label: 'Movimentação' },
]

const STATUS_OPTIONS = [
  { value: undefined, label: 'Todos' },
  { value: 'success' as const, label: 'Sucesso' },
  { value: 'error' as const, label: 'Erro' },
]

export default function ActionsPage() {
  const {
    items,
    total,
    loading,
    error,
    typeFilter,
    setTypeFilter,
    statusFilter,
    setStatusFilter,
    offset,
    limit,
    reload,
    nextPage,
    prevPage,
  } = useActions()

  const { showToast } = useToast()
  const navigate = useNavigate()
  const [executing, setExecuting] = React.useState(false)

  const handleExecute = async () => {
    setExecuting(true)
    try {
      await actionsService.execute()
      showToast('Execução iniciada! Acompanhe o progresso.', 'success')
      navigate('/progress')
    } catch {
      showToast('Erro ao iniciar execução', 'error')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: '#e2e8f0', marginBottom: 6 }}>
            Histórico de Ações
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Deleções e movimentações executadas, com status e detalhes de cada operação.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="secondary" size="sm" onClick={reload} loading={loading}>
            ↻ Recarregar
          </Button>
          <Button variant="primary" size="sm" onClick={handleExecute} loading={executing}>
            ▶ Executar Aprovados
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#374151', alignSelf: 'center', marginRight: 4 }}>
            TIPO
          </span>
          {TYPE_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setTypeFilter(opt.value)}
              style={{
                padding: '5px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: typeFilter === opt.value ? '#6366f1' : '#1e2130',
                color: typeFilter === opt.value ? '#fff' : '#64748b',
                transition: 'background 0.15s',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <span style={{ fontSize: 11, color: '#374151', alignSelf: 'center', marginRight: 4 }}>
            STATUS
          </span>
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={String(opt.value)}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '5px 12px',
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
            gridTemplateColumns: '28px 1fr 90px 90px 80px 90px',
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
          <span />
          <span>Caminho</span>
          <span style={{ textAlign: 'right' }}>HD</span>
          <span style={{ textAlign: 'right' }}>Tamanho</span>
          <span>Status</span>
          <span style={{ textAlign: 'right' }}>Data</span>
        </div>

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Spinner />
          </div>
        )}

        {!loading && items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: '#374151', fontSize: 14 }}>
            Nenhuma ação registrada ainda.
          </div>
        )}

        {!loading && items.map((item) => <ActionLogRow key={item.id} item={item} />)}
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
            <Button
              size="sm"
              variant="secondary"
              onClick={nextPage}
              disabled={offset + limit >= total}
            >
              Próximo →
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
