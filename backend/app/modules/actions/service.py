from typing import Optional
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.shared.logger import get_logger

logger = get_logger(__name__)

COLLECTION = "storage_actions"


def _serialize(doc: dict) -> dict:
    """Convert ObjectId _id to string id."""
    if doc and "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def list_actions(
    db: AsyncIOMotorDatabase,
    page: int = 1,
    per_page: int = 50,
) -> dict:
    skip = (page - 1) * per_page
    cursor = db[COLLECTION].find({}).skip(skip).limit(per_page).sort("timestamp", -1)
    docs = []
    async for doc in cursor:
        docs.append(_serialize(doc))
    total = await db[COLLECTION].count_documents({})
    logger.info(f"list_actions page={page} per_page={per_page} total={total}")
    return {
        "items": docs,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": max(1, -(-total // per_page)),  # ceil division
    }


async def get_action(db: AsyncIOMotorDatabase, action_id: str) -> Optional[dict]:
    try:
        oid = ObjectId(action_id)
    except Exception:
        return None
    doc = await db[COLLECTION].find_one({"_id": oid})
    if doc is None:
        return None
    return _serialize(doc)


async def cancel_action(db: AsyncIOMotorDatabase, action_id: str) -> Optional[dict]:
    try:
        oid = ObjectId(action_id)
    except Exception:
        return None
    result = await db[COLLECTION].find_one_and_update(
        {"_id": oid, "status": {"$in": ["pending", "running"]}},
        {"$set": {"status": "cancelled"}},
        return_document=True,
    )
    if result is None:
        return None
    logger.info(f"cancel_action id={action_id}")
    return _serialize(result)
