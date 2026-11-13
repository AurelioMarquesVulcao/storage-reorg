"""
Unit tests for backend/app/modules/actions/service.py
Mocks: DB (fake Motor-compatible collections)
"""
import pytest
from bson import ObjectId
from unittest.mock import MagicMock


# ---------------------------------------------------------------------------
# Fake DB helpers (reuses the same pattern as test_duplicates_service.py)
# ---------------------------------------------------------------------------

class FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    def limit(self, n):
        self._docs = self._docs[:n] if n else self._docs
        return self

    def sort(self, *args, **kwargs):
        return self

    def __aiter__(self):
        self._index = 0
        return self

    async def __anext__(self):
        if self._index >= len(self._docs):
            raise StopAsyncIteration
        doc = self._docs[self._index]
        self._index += 1
        return doc


class FakeCollection:
    def __init__(self, docs):
        self._docs = list(docs)

    def find(self, query=None):
        return FakeCursor(self._docs)

    async def count_documents(self, query=None):
        return len(self._docs)

    async def find_one(self, query=None):
        for doc in self._docs:
            if "_id" in (query or {}) and doc.get("_id") == query["_id"]:
                return doc
        return None

    async def find_one_and_update(self, query, update, return_document=False, **kwargs):
        for doc in self._docs:
            oid = query.get("_id")
            if oid and doc.get("_id") == oid:
                # check status filter ($in)
                status_filter = query.get("status", {}).get("$in")
                if status_filter and doc.get("status") not in status_filter:
                    return None
                for k, v in update.get("$set", {}).items():
                    doc[k] = v
                return doc
        return None


class FakeDb:
    def __init__(self, data):
        self._colls = {name: FakeCollection(docs) for name, docs in data.items()}

    def __getitem__(self, name):
        if name not in self._colls:
            self._colls[name] = FakeCollection([])
        return self._colls[name]


# ---------------------------------------------------------------------------
# Test 1 — list_actions: paginação e total correto
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_actions_pagination():
    """list_actions deve retornar página correta e metadados de paginação."""
    from app.modules.actions.service import list_actions

    docs = [
        {
            "_id": ObjectId(),
            "type": "delete",
            "path": f"/mnt/dados/file{i}.mkv",
            "size_bytes": 1000 * i,
            "hd": "/mnt/dados",
            "status": "success",
            "timestamp": f"2026-11-13T10:0{i}:00",
        }
        for i in range(1, 6)  # 5 docs
    ]
    db = FakeDb({"storage_actions": docs})

    # página 1, 3 por página
    result = await list_actions(db, page=1, per_page=3)
    assert result["total"] == 5
    assert result["page"] == 1
    assert result["per_page"] == 3
    assert result["pages"] == 2
    assert len(result["items"]) == 3

    # página 2 — restam 2 docs
    result_p2 = await list_actions(db, page=2, per_page=3)
    assert len(result_p2["items"]) == 2
    assert result_p2["page"] == 2


# ---------------------------------------------------------------------------
# Test 2 — cancel_action: cancela pending/running, não cancela success
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_cancel_action_states():
    """cancel_action deve cancelar pending/running e retornar None para outros estados."""
    from app.modules.actions.service import cancel_action

    oid_pending = ObjectId()
    oid_success = ObjectId()
    docs = [
        {
            "_id": oid_pending,
            "type": "move",
            "path": "/mnt/dados/x.mkv",
            "size_bytes": 500,
            "hd": "/mnt/dados",
            "status": "pending",
            "timestamp": "2026-11-13T10:00:00",
        },
        {
            "_id": oid_success,
            "type": "delete",
            "path": "/mnt/dados/y.mkv",
            "size_bytes": 300,
            "hd": "/mnt/dados",
            "status": "success",
            "timestamp": "2026-11-13T09:00:00",
        },
    ]
    db = FakeDb({"storage_actions": docs})

    # Cancelar uma ação pending — deve funcionar
    result = await cancel_action(db, str(oid_pending))
    assert result is not None
    assert result["status"] == "cancelled"
    assert result["id"] == str(oid_pending)

    # Cancelar uma ação success — deve retornar None (não cancelável)
    result_no = await cancel_action(db, str(oid_success))
    assert result_no is None

    # ID inválido — deve retornar None sem levantar exceção
    result_invalid = await cancel_action(db, "not-valid-objectid")
    assert result_invalid is None
