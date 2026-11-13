import os
import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId


HD_PRIORITY = [
    "/mnt/1tb-filmes",
    "/mnt/1tera",
    "/mnt/aurelio-yasmin",
    "/mnt/dados",
    "/mnt/samsung300",
]


def _doc_to_dict(doc: dict) -> dict:
    """Converte _id ObjectId para string id."""
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


async def detect_duplicates(db, scan_id: str) -> list[dict]:
    """Lê duplicatas do scan salvo, enriquece com id, retorna lista."""
    cursor = db["storage_duplicates"].find({"scan_id": scan_id})
    docs = await cursor.to_list(length=None)
    return [_doc_to_dict(d) for d in docs]


async def list_duplicates(
    db,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """Pagina a coleção storage_duplicates com filtro opcional por status."""
    query: dict = {}
    if status:
        query["status"] = status

    total = await db["storage_duplicates"].count_documents(query)
    cursor = (
        db["storage_duplicates"]
        .find(query, {"_id": 1, "filename": 1, "size_bytes": 1, "size_human": 1,
                      "master_path": 1, "master_hd": 1, "copies": 1,
                      "approved": 1, "status": 1, "wasted_bytes": 1, "wasted_human": 1})
        .sort("wasted_bytes", -1)
        .skip(offset)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return {
        "total": total,
        "items": [_doc_to_dict(d) for d in docs],
    }


async def get_summary(db) -> dict:
    """Retorna totais: quantidades por status, bytes a economizar."""
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1},
                "wasted_bytes": {"$sum": "$wasted_bytes"},
            }
        }
    ]
    cursor = db["storage_duplicates"].aggregate(pipeline)
    rows = await cursor.to_list(length=None)

    counts = {r["_id"]: r["count"] for r in rows}
    total_wasted = sum(r["wasted_bytes"] for r in rows)
    total = sum(counts.values())

    def human(b: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if b < 1024:
                return f"{b:.1f} {unit}"
            b //= 1024
        return f"{b:.1f} TB"

    return {
        "total": total,
        "pending": counts.get("pending", 0),
        "approved": counts.get("approved", 0),
        "deleted": counts.get("deleted", 0),
        "skipped": counts.get("skipped", 0),
        "total_wasted_bytes": total_wasted,
        "total_wasted_human": human(total_wasted),
    }


async def approve_duplicate(db, item_id: str) -> Optional[dict]:
    """Marca um item como approved=True, status='approved'."""
    try:
        oid = ObjectId(item_id)
    except Exception:
        return None

    result = await db["storage_duplicates"].find_one_and_update(
        {"_id": oid},
        {"$set": {"approved": True, "status": "approved"}},
        return_document=True,
    )
    if result is None:
        return None
    return {"id": item_id, "approved": True, "status": "approved"}


async def skip_duplicate(db, item_id: str) -> Optional[dict]:
    """Marca um item como skipped."""
    try:
        oid = ObjectId(item_id)
    except Exception:
        return None

    result = await db["storage_duplicates"].find_one_and_update(
        {"_id": oid},
        {"$set": {"approved": False, "status": "skipped"}},
        return_document=True,
    )
    if result is None:
        return None
    return {"id": item_id, "approved": False, "status": "skipped"}


async def approve_all(db) -> dict:
    """Aprova todas as duplicatas com status 'pending'."""
    result = await db["storage_duplicates"].update_many(
        {"status": "pending"},
        {"$set": {"approved": True, "status": "approved"}},
    )
    return {"approved_count": result.modified_count}


async def approve_duplicates(db, ids: list[str]) -> dict:
    """Marca os ids fornecidos como approved=True em storage_duplicates."""
    oids = []
    for i in ids:
        try:
            oids.append(ObjectId(i))
        except Exception:
            pass

    if not oids:
        return {"approved_count": 0}

    result = await db["storage_duplicates"].update_many(
        {"_id": {"$in": oids}},
        {"$set": {"approved": True, "status": "approved"}},
    )
    return {"approved_count": result.modified_count}


async def execute_deletions(db) -> dict:
    """Deleta arquivos aprovados (apenas cópias, nunca o master).
    Registra cada ação em storage_actions e storage_logs."""
    cursor = db["storage_duplicates"].find({"status": "approved"})
    approved = await cursor.to_list(length=None)

    deleted_count = 0
    error_count = 0
    freed_bytes = 0
    now = datetime.now(timezone.utc).isoformat()

    for doc in approved:
        item_id = doc["_id"]
        copies = doc.get("copies", [])

        for copy in copies:
            path = copy["path"]
            hd = copy["hd"]
            size = doc.get("size_bytes", 0)

            action: dict = {
                "type": "delete",
                "path": path,
                "size_bytes": size,
                "hd": hd,
                "timestamp": now,
                "duplicate_id": str(item_id),
                "filename": doc.get("filename"),
            }

            try:
                if os.path.isfile(path):
                    os.remove(path)
                    action["status"] = "success"
                    freed_bytes += size
                    deleted_count += 1
                else:
                    action["status"] = "error"
                    action["error_msg"] = "File not found"
                    error_count += 1
            except Exception as exc:
                action["status"] = "error"
                action["error_msg"] = str(exc)
                error_count += 1

            await db["storage_actions"].insert_one(action)
            await db["storage_logs"].insert_one({
                "event": "delete",
                "path": path,
                "status": action["status"],
                "error_msg": action.get("error_msg"),
                "timestamp": now,
            })

        # Atualiza status da duplicata
        all_deleted = True
        for c in copies:
            action_ok = await db["storage_actions"].find_one(
                {"path": c["path"], "status": "success"}, {"_id": 1}
            )
            if action_ok is None:
                all_deleted = False
                break
        new_status = "deleted" if all_deleted else "error"

        await db["storage_duplicates"].update_one(
            {"_id": item_id},
            {"$set": {"status": new_status}},
        )

    def human(b: int) -> str:
        for unit in ["B", "KB", "MB", "GB"]:
            if b < 1024:
                return f"{b:.1f} {unit}"
            b //= 1024
        return f"{b:.1f} TB"

    return {
        "deleted_count": deleted_count,
        "error_count": error_count,
        "freed_bytes": freed_bytes,
        "freed_human": human(freed_bytes),
    }
