# storage-reorg — Arquitetura do Projeto

## Objetivo
Aplicação web fullstack para análise, aprovação e execução de reorganização de armazenamento em HDs externos do homeserver.

## Stack
- **Frontend:** React + TypeScript + Vite
- **Backend:** Python + FastAPI
- **Banco:** MongoDB (já rodando, v8.0.32)
- **Infra:** PM2 (padrão do homeserver)

## Estrutura de pastas
```
storage-reorg/
  frontend/          # React + TS + Vite
    src/
      app/           # rotas, layout, providers
      modules/
        duplicates/  # análise de duplicatas — pages, components, services, types
        optimize/    # relatório de otimização — pages, components, services, types
        actions/     # aprovação e execução — pages, components, services, types
        progress/    # progresso em tempo real — pages, components, services, types
      shared/
        ui/          # Button, Card, Badge, Toast, Spinner, ProgressBar, Modal, AnimatedCheck
        hooks/
        http/
        types/
  backend/
    app/
      main.py
      modules/
        scanner/     # varre HDs, gera catálogo de vídeos
        duplicates/  # detecta duplicatas, calcula economia
        optimize/    # plano de reorganização de discos
        actions/     # executa movimentações/deleções aprovadas
        progress/    # SSE / websocket de progresso
      shared/
        config.py
        database.py  # MongoDB (motor async)
        logger.py
        schemas.py
  ARCHITECTURE.md
  README.md
```

## Domínios

### duplicates
- Lê `/tmp/all_videos.tsv` (já gerado) + varre HDs ao vivo
- Detecta arquivos com mesmo nome em múltiplos HDs
- Calcula qual é o "master" (HD destino correto) e quais são cópias
- Gera lista de deleção com: path, tamanho, HD origem, HD master, status

### optimize
- Analisa uso/livre por HD
- Propõe movimentações: de → para, tamanho, motivo
- Calcula estado antes/depois de cada disco

### actions
- Recebe lista aprovada pelo usuário
- Executa `rm` / `rsync --remove-source-files` com segurança
- Registra cada ação no MongoDB
- Emite progresso via SSE

### progress
- SSE endpoint: `/api/progress/stream`
- Frontend consome e exibe barra animada + log em tempo real

## MongoDB — coleções
```
storage_scans       # cada varredura completa dos HDs
storage_duplicates  # lista de duplicatas detectadas
storage_actions     # cada ação aprovada/executada/falha
storage_moves       # plano de movimentação de pastas
storage_logs        # log geral de operações
```

## Contratos principais (TypeScript + Pydantic)

### DuplicateFile
```ts
{
  id: string
  filename: string
  size_bytes: number
  size_human: string
  master_path: string
  master_hd: string
  copies: Array<{ path: string; hd: string }>
  approved: boolean   // usuário marca na UI
  status: 'pending' | 'approved' | 'deleted' | 'skipped' | 'error'
}
```

### MoveProposal
```ts
{
  id: string
  folder: string
  size_bytes: number
  from_hd: string
  to_hd: string
  reason: string
  approved: boolean
  status: 'pending' | 'approved' | 'moved' | 'error'
}
```

### ActionLog
```ts
{
  id: string
  type: 'delete' | 'move'
  path: string
  size_bytes: number
  hd: string
  timestamp: string
  status: 'success' | 'error'
  error_msg?: string
}
```

## Regras de engenharia (ver skill engenharia-software-ia)
- Tipos/interfaces primeiro, depois service, depois componente
- Service/API isolado por domínio
- Shared só recebe componentes genéricos (Button, Card, etc.)
- Regra de negócio fora de componente visual
- Nenhuma feature sem teste unitário

## Portas
- Frontend dev: 5173 | prod: 3040
- Backend: 8070

## Dados de entrada disponíveis
- `/tmp/all_videos.tsv` — 6.261 vídeos catalogados (tamanho, nome, path)
- Discos: /mnt/dados (466G/52%), /mnt/aurelio-yasmin (597G/77%), /mnt/1tera (932G/88%), /mnt/samsung300 (298G/27%), /mnt/1tb-filmes (932G/76%)
- mergerfs pool: /mnt/pool (une ALL_DISC de 4 HDs)
- fstab: 42 bind mounts samsung300→dados (a remover)
