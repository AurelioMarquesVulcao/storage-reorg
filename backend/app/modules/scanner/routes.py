from fastapi import APIRouter, Depends, HTTPException
from app.shared.database import get_db
from app.modules.scanner import service

router = APIRouter(prefix="/api/scanner", tags=["scanner"])


@router.get("/")
async def status():
    return {"status": "ok", "module": "scanner"}


@router.post("/scan")
async def start_scan(db=Depends(get_db)):
    """Dispara varredura dos HDs. Retorna scan_id e status inicial."""
    scan_id = await service.scan_hds(db)
    result = await service.get_scan_status(db, scan_id)
    return result


@router.get("/status")
async def latest_scan_status(db=Depends(get_db)):
    """Retorna status da última varredura."""
    result = await service.get_latest_scan(db)
    if not result:
        raise HTTPException(status_code=404, detail="No scan found")
    return result


@router.get("/hds")
async def list_hds():
    """Retorna info de uso de cada HD configurado."""
    return service.get_hd_info()


@router.get("/{scan_id}")
async def get_scan(scan_id: str, db=Depends(get_db)):
    """Retorna status de uma varredura pelo scan_id."""
    result = await service.get_scan_status(db, scan_id)
    if not result:
        raise HTTPException(status_code=404, detail=f"Scan {scan_id!r} not found")
    return result
