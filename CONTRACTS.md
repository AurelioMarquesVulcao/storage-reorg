# CONTRACTS.md — Contratos de API

Todos os endpoints do backend `storage-reorg`. Base URL: `http://localhost:8070`.

---

## Health

### `GET /api/health`
**Descrição:** Verifica se o backend está no ar.  
**Response:**
```json
{ "status": "ok" }
```

---

## Scanner — `/api/scanner`

### `GET /api/scanner/`
**Descrição:** Status do módulo scanner.  
**Response:**
```json
{ "status": "ok", "module": "scanner" }
```

### `POST /api/scanner/scan`
**Descrição:** Inicia uma nova varredura dos HDs listados em `HDS`.  
**Request Body:** _(nenhum)_  
**Response:**
```json
{
  "scan_id": "string",
  "status": "running",
  "total_files": 0,
  "total_duplicates": 0,
  "total_wasted_bytes": 0,
  "total_wasted_human": "0 B",
  "scanned_at": "2026-11-13T00:00:00Z"
}
```

### `GET /api/scanner/status`
**Descrição:** Retorna o status da última varredura.  
**Response:** `ScanResult`

### `GET /api/scanner/hds`
**Descrição:** Lista informações de uso de cada HD configurado.  
**Response:**
```json
[
  {
    "mount": "/mnt/dados",
    "label": "dados",
    "size_bytes": 500107862016,
    "used_bytes": 260056244224,
    "free_bytes": 240051617792,
    "use_pct": 52.0,
    "size_human": "466 GB",
    "used_human": "242 GB",
    "free_human": "224 GB"
  }
]
```

---

## Duplicates — `/api/duplicates`

### `GET /api/duplicates/`
**Descrição:** Status do módulo duplicatas.

### `GET /api/duplicates/list`
**Descrição:** Lista todas as duplicatas detectadas na última varredura.  
**Query params:** `status` (opcional, filtra por status), `limit` (default 100), `offset` (default 0)  
**Response:**
```json
{
  "total": 142,
  "items": [
    {
      "id": "string",
      "filename": "Filme.mkv",
      "size_bytes": 4294967296,
      "size_human": "4.0 GB",
      "master_path": "/mnt/dados/Filmes/Filme.mkv",
      "master_hd": "/mnt/dados",
      "copies": [
        { "path": "/mnt/aurelio-yasmin/Filmes/Filme.mkv", "hd": "/mnt/aurelio-yasmin" }
      ],
      "approved": false,
      "status": "pending"
    }
  ]
}
```

### `PATCH /api/duplicates/{id}/approve`
**Descrição:** Marca uma duplicata como aprovada para deleção.  
**Request Body:** _(nenhum)_  
**Response:**
```json
{ "id": "string", "approved": true, "status": "approved" }
```

### `PATCH /api/duplicates/{id}/skip`
**Descrição:** Marca uma duplicata como ignorada.  
**Response:**
```json
{ "id": "string", "approved": false, "status": "skipped" }
```

### `POST /api/duplicates/approve-all`
**Descrição:** Aprova todas as duplicatas pendentes.  
**Response:**
```json
{ "approved_count": 42 }
```

### `GET /api/duplicates/summary`
**Descrição:** Totais de duplicatas, bytes a economizar, contagem por status.  
**Response:**
```json
{
  "total": 142,
  "pending": 100,
  "approved": 40,
  "deleted": 2,
  "skipped": 0,
  "total_wasted_bytes": 128849018880,
  "total_wasted_human": "120 GB"
}
```

---

## Optimize — `/api/optimize`

### `GET /api/optimize/`
**Descrição:** Status do módulo otimização.

### `GET /api/optimize/proposals`
**Descrição:** Lista propostas de movimentação de pastas entre HDs.  
**Query params:** `status` (opcional), `limit`, `offset`  
**Response:**
```json
{
  "total": 15,
  "items": [
    {
      "id": "string",
      "folder": "/mnt/1tera/Series",
      "size_bytes": 107374182400,
      "size_human": "100 GB",
      "from_hd": "/mnt/1tera",
      "to_hd": "/mnt/samsung300",
      "reason": "HD origem com 88% uso; destino com 27% uso",
      "approved": false,
      "status": "pending"
    }
  ]
}
```

### `PATCH /api/optimize/proposals/{id}/approve`
**Descrição:** Aprova uma proposta de movimentação.  
**Response:**
```json
{ "id": "string", "approved": true, "status": "approved" }
```

### `PATCH /api/optimize/proposals/{id}/skip`
**Descrição:** Ignora uma proposta.

### `GET /api/optimize/hd-state`
**Descrição:** Retorna estado atual e projetado (após movimentações aprovadas) de cada HD.  
**Response:**
```json
[
  {
    "mount": "/mnt/1tera",
    "current_use_pct": 88.0,
    "projected_use_pct": 72.0,
    "delta_bytes": -16106127360
  }
]
```

---

## Actions — `/api/actions`

### `GET /api/actions/`
**Descrição:** Status do módulo ações.

### `POST /api/actions/execute`
**Descrição:** Executa todas as duplicatas aprovadas (deleta cópias) e movimentações aprovadas.  
**Request Body:** _(nenhum)_  
**Response:**
```json
{ "job_id": "string", "status": "running" }
```

### `GET /api/actions/logs`
**Descrição:** Lista o histórico de ações executadas.  
**Query params:** `type` (`delete` | `move`), `status` (`success` | `error`), `limit`, `offset`  
**Response:**
```json
{
  "total": 58,
  "items": [
    {
      "id": "string",
      "type": "delete",
      "path": "/mnt/aurelio-yasmin/Filmes/Filme.mkv",
      "size_bytes": 4294967296,
      "size_human": "4.0 GB",
      "hd": "/mnt/aurelio-yasmin",
      "timestamp": "2026-11-13T12:00:00Z",
      "status": "success",
      "error_msg": null
    }
  ]
}
```

### `GET /api/actions/logs/{id}`
**Descrição:** Detalhe de uma ação específica.  
**Response:** `ActionLog`

---

## Progress — `/api/progress`

### `GET /api/progress/`
**Descrição:** Status do módulo progresso.

### `GET /api/progress/stream`
**Descrição:** SSE stream de progresso em tempo real durante execução de ações.  
**Headers:** `Accept: text/event-stream`  
**Events:**
```
data: {"type": "progress", "done": 12, "total": 58, "current_path": "/mnt/.../Filme.mkv", "pct": 20.7}
data: {"type": "log", "message": "Deleted: Filme.mkv (4.0 GB)", "status": "success"}
data: {"type": "done", "total_deleted": 48, "total_moved": 10, "freed_bytes": 128849018880, "freed_human": "120 GB"}
data: {"type": "error", "message": "Permission denied: /mnt/1tera/Filme.mkv"}
```

### `GET /api/progress/current`
**Descrição:** Retorna o estado atual do job em execução (para polling como alternativa ao SSE).  
**Response:**
```json
{
  "job_id": "string",
  "running": true,
  "done": 12,
  "total": 58,
  "pct": 20.7,
  "current_path": "/mnt/.../Filme.mkv"
}
```

---

## Schemas de referência

### ScanResult
```json
{
  "scan_id": "string",
  "status": "running | done | error",
  "total_files": 6261,
  "total_duplicates": 142,
  "total_wasted_bytes": 128849018880,
  "total_wasted_human": "120 GB",
  "scanned_at": "2026-11-13T12:00:00Z"
}
```

### HdInfo
```json
{
  "mount": "/mnt/dados",
  "label": "dados",
  "size_bytes": 0,
  "used_bytes": 0,
  "free_bytes": 0,
  "use_pct": 52.0,
  "size_human": "string",
  "used_human": "string",
  "free_human": "string"
}
```

---

## Coleções MongoDB

| Coleção           | Uso                                      |
|-------------------|------------------------------------------|
| storage_scans     | Uma entrada por varredura completa       |
| storage_duplicates| Duplicatas detectadas                    |
| storage_actions   | Log de cada ação executada               |
| storage_moves     | Plano de movimentação de pastas          |
| storage_logs      | Log geral de operações                   |
