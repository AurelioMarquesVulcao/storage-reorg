import { useProgress } from '../hooks/useProgress'
import ProgressLog from '../components/ProgressLog'
import FinishedCard from '../components/FinishedCard'
import { Button, Card, ProgressBar, Spinner } from '../../../shared/ui'

export default function ProgressPage() {
  const {
    running,
    done,
    total,
    pct,
    current_path,
    logs,
    finished,
    connected,
    error,
    connect,
    disconnect,
  } = useProgress()

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
            Progresso
          </h1>
          <p style={{ color: '#64748b', fontSize: 14 }}>
            Acompanhe em tempo real o andamento das operações via SSE.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {!running && !connected && (
            <Button variant="primary" size="sm" onClick={connect}>
              ▶ Conectar SSE
            </Button>
          )}
          {(running || connected) && (
            <Button variant="secondary" size="sm" onClick={disconnect}>
              ■ Desconectar
            </Button>
          )}
        </div>
      </div>

      {/* Finished result */}
      {finished && (
        <div style={{ marginBottom: 24 }}>
          <FinishedCard result={finished} />
        </div>
      )}

      {/* Progress card */}
      {!finished && (
        <Card style={{ marginBottom: 24 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>
              {running ? 'Em execução…' : connected ? 'Aguardando início…' : 'Aguardando conexão'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {(running || connected) && <Spinner size={16} />}
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: connected ? '#4ade80' : '#374151',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, color: connected ? '#4ade80' : '#374151' }}>
                {connected ? 'conectado' : 'desconectado'}
              </span>
            </div>
          </div>

          <ProgressBar
            pct={pct}
            animated={running}
            showLabel
            height={10}
            color={pct >= 100 ? '#4ade80' : '#6366f1'}
          />

          {total > 0 && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 10,
                fontSize: 12,
                color: '#4a5568',
              }}
            >
              <span>
                {done} / {total} operações
              </span>
              {current_path && (
                <span
                  style={{
                    color: '#374151',
                    maxWidth: '60%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {current_path}
                </span>
              )}
            </div>
          )}
        </Card>
      )}

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

      {/* Log */}
      <div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#374151',
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            marginBottom: 8,
          }}
        >
          Log de operações{logs.length > 0 && ` (${logs.length})`}
        </div>
        <ProgressLog logs={logs} />
      </div>
    </div>
  )
}
