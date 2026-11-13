# Storage Reorg

Aplicação web fullstack para análise, aprovação e execução de reorganização de armazenamento em HDs externos do homeserver.

## Stack

- **Frontend:** React 18 + TypeScript + Vite — porta 5173 (dev) / 3040 (prod)
- **Backend:** Python 3.11+ + FastAPI — porta 8070
- **Banco:** MongoDB (já rodando, v8.0.32) — `storage_reorg`
- **Infra:** PM2

## Estrutura

```
storage-reorg/
  frontend/          # React + TS + Vite
  backend/           # FastAPI + motor (MongoDB async)
  ARCHITECTURE.md    # Decisões de arquitetura
  CONTRACTS.md       # Contratos de API (todos os endpoints)
  README.md          # Este arquivo
```

## Setup rápido

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8070
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## HDs configurados

| Ponto de montagem     | Uso atual |
|-----------------------|-----------|
| /mnt/dados            | 52%       |
| /mnt/aurelio-yasmin   | 77%       |
| /mnt/1tera            | 88%       |
| /mnt/samsung300       | 27%       |
| /mnt/1tb-filmes       | 76%       |

## Módulos

| Módulo       | Descrição                                                   |
|--------------|-------------------------------------------------------------|
| `scanner`    | Varre HDs, lê `/tmp/all_videos.tsv`, gera catálogo          |
| `duplicates` | Detecta arquivos duplicados, calcula economia               |
| `optimize`   | Propõe movimentações entre discos para balancear uso        |
| `actions`    | Executa deleções e movimentações aprovadas                  |
| `progress`   | SSE stream de progresso em tempo real                       |

## Contratos

Ver [CONTRACTS.md](./CONTRACTS.md) para todos os endpoints, request/response schemas.

## Dados de entrada

- `/tmp/all_videos.tsv` — 6.261 vídeos catalogados (tamanho, nome, path, HD)

## Testes

```bash
# Frontend
cd frontend
npm run test:run
npm run test:coverage

# Backend (a implementar com pytest)
cd backend
pytest tests/
```
