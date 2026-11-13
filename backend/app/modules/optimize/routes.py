"""
optimize/routes.py — Endpoints de otimização de discos.

GET  /api/optimize/hds          → lista uso atual de cada HD
GET  /api/optimize/plan         → gera/retorna plano de movimentações
GET  /api/optimize/proposals    → lista propostas (paginado, filtro status)
GET  /api/optimize/hd-state     → estado atual e projetado por HD
PATCH /api/optimize/proposals/{id}/approve  → aprova uma proposta
PATCH /api/optimize/proposals/{id}/skip     → pula uma proposta
POST /api/optimize/approve      → aprova lista de ids  {ids:[str]}
POST /api/optimize/execute      → executa movimentações aprovadas
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional

from app.shared.database import get_db
from app.modules.optimize import service

router = APIRouter(prefix="/api/optimize", tags=["optimize"])


@router.get("/")
async def status():
    return {"status": "ok", "module": "optimize"}


# ---------------------------------------------------------------------------
# HD info
# ---------------------------------------------------------------------------

@router.get("/hds")
async def list_hds(db=Depends(get_db)):
    """Retorna uso atual de cada HD configurado."""
    return await service.get_hd_info(db)


# ---------------------------------------------------------------------------
# Plano de movimentações
# ---------------------------------------------------------------------------

@router.get("/plan")
async def get_plan(db=Depends(get_db)):
    """Gera (ou regera) o plano de movimentações e retorna lista de MoveProposal."""
    proposals = await service.generate_optimize_plan(db)
    return {"total": len(proposals), "items": proposals}


@router.get("/proposals")
async def list_proposals(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db=Depends(get_db),
):
    """Lista propostas de movimentação com paginação e filtro por status."""
    return await service.list_proposals(db, status=status, limit=limit, offset=offset)


# ---------------------------------------------------------------------------
# HD state (antes × depois)
# ---------------------------------------------------------------------------

@router.get("/hd-state")
async def hd_state(db=Depends(get_db)):
    """Retorna estado atual e projetado (após aprovações) de cada HD."""
    return await service.get_hd_state(db)


# ---------------------------------------------------------------------------
# Aprovação individual
# ---------------------------------------------------------------------------

@router.patch("/proposals/{item_id}/approve")
async def approve_one(item_id: str, db=Depends(get_db)):
    """Aprova uma proposta de movimentação."""
    result = await service.approve_one(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Proposal {item_id!r} not found")
    return result


@router.patch("/proposals/{item_id}/skip")
async def skip_one(item_id: str, db=Depends(get_db)):
    """Ignora uma proposta."""
    result = await service.skip_one(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Proposal {item_id!r} not found")
    return result


# ---------------------------------------------------------------------------
# Aprovação em lote
# ---------------------------------------------------------------------------

@router.post("/approve")
async def approve_many(body: dict, db=Depends(get_db)):
    """Aprova uma lista de propostas. Body: {ids: [str]}"""
    ids = body.get("ids", [])
    if not isinstance(ids, list):
        raise HTTPException(status_code=422, detail="'ids' must be a list of strings")
    return await service.approve_moves(db, ids)


# ---------------------------------------------------------------------------
# Execução
# ---------------------------------------------------------------------------

@router.post("/execute")
async def execute(db=Depends(get_db)):
    """Executa rsync/rm para todas as propostas aprovadas."""
    return await service.execute_moves(db)
