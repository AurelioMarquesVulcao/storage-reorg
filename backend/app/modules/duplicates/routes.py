from fastapi import APIRouter, Depends, HTTPException, Query
from typing import Optional
from app.shared.database import get_db
from app.modules.duplicates import service

router = APIRouter(prefix="/api/duplicates", tags=["duplicates"])


@router.get("/")
async def status():
    return {"status": "ok", "module": "duplicates"}


@router.get("/summary")
async def summary(db=Depends(get_db)):
    """Totais de duplicatas, bytes a economizar, contagem por status."""
    return await service.get_summary(db)


@router.get("/list")
async def list_duplicates(
    status: Optional[str] = Query(None, description="Filtrar por status"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db=Depends(get_db),
):
    """Lista duplicatas detectadas com paginação e filtro opcional por status."""
    return await service.list_duplicates(db, status=status, limit=limit, offset=offset)


@router.patch("/{item_id}/approve")
async def approve_one(item_id: str, db=Depends(get_db)):
    """Marca uma duplicata como aprovada para deleção."""
    result = await service.approve_duplicate(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Duplicate {item_id!r} not found")
    return result


@router.patch("/{item_id}/skip")
async def skip_one(item_id: str, db=Depends(get_db)):
    """Marca uma duplicata como ignorada."""
    result = await service.skip_duplicate(db, item_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Duplicate {item_id!r} not found")
    return result


@router.post("/approve-all")
async def approve_all(db=Depends(get_db)):
    """Aprova todas as duplicatas pendentes."""
    return await service.approve_all(db)


@router.post("/approve")
async def approve_many(body: dict, db=Depends(get_db)):
    """Aprova os ids fornecidos. Body: {ids: [str]}"""
    ids = body.get("ids", [])
    if not isinstance(ids, list):
        raise HTTPException(status_code=422, detail="'ids' must be a list")
    return await service.approve_duplicates(db, ids)


@router.post("/execute")
async def execute(db=Depends(get_db)):
    """Executa deleções de todas as duplicatas aprovadas."""
    return await service.execute_deletions(db)
