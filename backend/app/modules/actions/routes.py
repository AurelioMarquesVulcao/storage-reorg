from fastapi import APIRouter, HTTPException, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.shared.database import get_db
from app.modules.actions import service

router = APIRouter(prefix="/api/actions", tags=["actions"])


@router.get("/")
async def list_actions(
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    return await service.list_actions(db, page=page, per_page=per_page)


@router.get("/{action_id}")
async def get_action(
    action_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await service.get_action(db, action_id)
    if doc is None:
        raise HTTPException(status_code=404, detail="Action not found")
    return doc


@router.delete("/{action_id}")
async def cancel_action(
    action_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    doc = await service.cancel_action(db, action_id)
    if doc is None:
        raise HTTPException(
            status_code=404,
            detail="Action not found or not in a cancellable state",
        )
    return doc
