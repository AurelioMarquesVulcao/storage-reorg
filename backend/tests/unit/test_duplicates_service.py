"""
Unit tests for backend/app/modules/duplicates/service.py
Mocks: DB (AsyncMock) and filesystem (os.path.isfile, os.remove)
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch, call
from bson import ObjectId


# ---------------------------------------------------------------------------
# Helpers / fixtures
# ---------------------------------------------------------------------------

def _make_db(collection_data: dict[str, list] | None = None) -> MagicMock:
    """Return a minimal fake Motor db with async-compatible collections."""
    collection_data = collection_data or {}

    class FakeCursor:
        def __init__(self, docs):
            self._docs = docs

        def sort(self, *args, **kwargs):
            return self

        def skip(self, n):
            self._docs = self._docs[n:]
            return self

        def limit(self, n):
            self._docs = self._docs[:n] if n else self._docs
            return self

        async def to_list(self, length=None):
            if length is not None:
                return list(self._docs[:length])
            return list(self._docs)

    class FakeCollection:
        def __init__(self, docs):
            self._docs = list(docs)

        def find(self, query=None, projection=None):
            if query:
                # simple equality filter only
                filtered = [
                    d for d in self._docs
                    if all(d.get(k) == v for k, v in query.items() if not isinstance(v, dict))
                ]
            else:
                filtered = list(self._docs)
            return FakeCursor(filtered)

        async def find_one(self, query=None, projection=None):
            docs = [
                d for d in self._docs
                if all(d.get(k) == v for k, v in (query or {}).items() if not isinstance(v, dict))
            ]
            return docs[0] if docs else None

        async def count_documents(self, query=None):
            if not query:
                return len(self._docs)
            filtered = [
                d for d in self._docs
                if all(d.get(k) == v for k, v in query.items() if not isinstance(v, dict))
            ]
            return len(filtered)

        def aggregate(self, pipeline):
            # Return empty cursor for aggregate
            return FakeCursor([])

        async def insert_one(self, doc):
            self._docs.append(doc)
            return MagicMock(inserted_id=ObjectId())

        async def insert_many(self, docs):
            self._docs.extend(docs)
            return MagicMock(inserted_ids=[ObjectId() for _ in docs])

        async def update_one(self, query, update, **kwargs):
            for doc in self._docs:
                match = all(
                    doc.get(k) == v
                    for k, v in query.items()
                    if not isinstance(v, dict)
                )
                if match:
                    for k, v in update.get("$set", {}).items():
                        doc[k] = v
                    return MagicMock(modified_count=1)
            return MagicMock(modified_count=0)

        async def update_many(self, query, update, **kwargs):
            count = 0
            for doc in self._docs:
                match = all(
                    doc.get(k) == v
                    for k, v in query.items()
                    if not isinstance(v, dict)
                )
                if match:
                    for k, v in update.get("$set", {}).items():
                        doc[k] = v
                    count += 1
            return MagicMock(modified_count=count)

        async def find_one_and_update(self, query, update, return_document=False, **kwargs):
            for doc in self._docs:
                # match by _id ObjectId
                if "_id" in query and doc.get("_id") == query["_id"]:
                    for k, v in update.get("$set", {}).items():
                        doc[k] = v
                    return doc
            return None

        async def delete_many(self, query=None):
            if not query:
                self._docs.clear()
            return MagicMock(deleted_count=0)

    class FakeDb:
        def __init__(self, data):
            self._colls: dict[str, FakeCollection] = {
                name: FakeCollection(docs) for name, docs in data.items()
            }

        def __getitem__(self, name: str) -> FakeCollection:
            if name not in self._colls:
                self._colls[name] = FakeCollection([])
            return self._colls[name]

    return FakeDb(collection_data)


# ---------------------------------------------------------------------------
# Test 1 — list_duplicates: paginação e filtro por status
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_list_duplicates_pagination_and_filter():
    """list_duplicates deve paginar corretamente e respeitar filtro de status."""
    from app.modules.duplicates.service import list_duplicates

    oid1, oid2, oid3 = ObjectId(), ObjectId(), ObjectId()
    docs = [
        {"_id": oid1, "filename": "a.mkv", "size_bytes": 100, "size_human": "100.0 B",
         "master_path": "/mnt/1tb-filmes/a.mkv", "master_hd": "/mnt/1tb-filmes",
         "copies": [{"path": "/mnt/dados/a.mkv", "hd": "/mnt/dados"}],
         "approved": False, "status": "pending", "wasted_bytes": 100, "wasted_human": "100.0 B"},
        {"_id": oid2, "filename": "b.mkv", "size_bytes": 200, "size_human": "200.0 B",
         "master_path": "/mnt/1tb-filmes/b.mkv", "master_hd": "/mnt/1tb-filmes",
         "copies": [{"path": "/mnt/dados/b.mkv", "hd": "/mnt/dados"}],
         "approved": True, "status": "approved", "wasted_bytes": 200, "wasted_human": "200.0 B"},
        {"_id": oid3, "filename": "c.mkv", "size_bytes": 300, "size_human": "300.0 B",
         "master_path": "/mnt/1tera/c.mkv", "master_hd": "/mnt/1tera",
         "copies": [{"path": "/mnt/dados/c.mkv", "hd": "/mnt/dados"}],
         "approved": False, "status": "pending", "wasted_bytes": 300, "wasted_human": "300.0 B"},
    ]
    db = _make_db({"storage_duplicates": docs})

    # sem filtro — retorna 3 items
    result = await list_duplicates(db, limit=10, offset=0)
    assert result["total"] == 3
    assert len(result["items"]) == 3

    # filtro pending — retorna 2
    result_pending = await list_duplicates(db, status="pending", limit=10, offset=0)
    assert result_pending["total"] == 2
    assert all(i["status"] == "pending" for i in result_pending["items"])

    # filtro approved — retorna 1
    result_approved = await list_duplicates(db, status="approved", limit=10, offset=0)
    assert result_approved["total"] == 1
    assert result_approved["items"][0]["status"] == "approved"


# ---------------------------------------------------------------------------
# Test 2 — approve_duplicate e skip_duplicate: status correto no DB
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_and_skip_duplicate():
    """approve_duplicate e skip_duplicate devem atualizar status e retornar dict correto."""
    from app.modules.duplicates.service import approve_duplicate, skip_duplicate

    oid = ObjectId()
    docs = [
        {"_id": oid, "filename": "x.mkv", "approved": False, "status": "pending",
         "wasted_bytes": 500},
    ]
    db = _make_db({"storage_duplicates": docs})

    # approve
    result = await approve_duplicate(db, str(oid))
    assert result is not None
    assert result["approved"] is True
    assert result["status"] == "approved"
    assert result["id"] == str(oid)
    # doc atualizado na coleção
    updated = db["storage_duplicates"]._docs[0]
    assert updated["approved"] is True
    assert updated["status"] == "approved"

    # skip
    result_skip = await skip_duplicate(db, str(oid))
    assert result_skip is not None
    assert result_skip["approved"] is False
    assert result_skip["status"] == "skipped"

    # ID inválido retorna None
    result_invalid = await approve_duplicate(db, "not-an-objectid")
    assert result_invalid is None


# ---------------------------------------------------------------------------
# Test 3 — execute_deletions: deleta cópias, registra ações, não toca no master
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_execute_deletions_deletes_copies_not_master():
    """execute_deletions deve deletar apenas as cópias e registrar storage_actions."""
    from app.modules.duplicates.service import execute_deletions

    oid = ObjectId()
    copy_path = "/mnt/dados/filme.mkv"
    master_path = "/mnt/1tb-filmes/filme.mkv"

    docs = [
        {
            "_id": oid,
            "filename": "filme.mkv",
            "size_bytes": 1_000_000,
            "master_path": master_path,
            "master_hd": "/mnt/1tb-filmes",
            "copies": [{"path": copy_path, "hd": "/mnt/dados"}],
            "approved": True,
            "status": "approved",
            "wasted_bytes": 1_000_000,
        }
    ]
    db = _make_db({"storage_duplicates": docs})

    deleted_paths = []

    def fake_isfile(p):
        return p == copy_path  # cópia existe, master não está sendo checado

    def fake_remove(p):
        deleted_paths.append(p)

    with patch("os.path.isfile", side_effect=fake_isfile), \
         patch("os.remove", side_effect=fake_remove):
        result = await execute_deletions(db)

    # Apenas a cópia foi deletada
    assert deleted_paths == [copy_path]
    assert master_path not in deleted_paths

    # Resultado reporta 1 deletado
    assert result["deleted_count"] == 1
    assert result["error_count"] == 0
    assert result["freed_bytes"] == 1_000_000

    # storage_actions registrou a ação
    actions = db["storage_actions"]._docs
    assert len(actions) == 1
    assert actions[0]["path"] == copy_path
    assert actions[0]["status"] == "success"
    assert actions[0]["type"] == "delete"


# ---------------------------------------------------------------------------
# Test 4 — approve_all: aprova todos os pending
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_all_only_pending():
    """approve_all deve aprovar apenas itens com status 'pending'."""
    from app.modules.duplicates.service import approve_all

    docs = [
        {"_id": ObjectId(), "filename": "a.mkv", "approved": False, "status": "pending",
         "wasted_bytes": 100},
        {"_id": ObjectId(), "filename": "b.mkv", "approved": False, "status": "pending",
         "wasted_bytes": 200},
        {"_id": ObjectId(), "filename": "c.mkv", "approved": False, "status": "skipped",
         "wasted_bytes": 300},
    ]
    db = _make_db({"storage_duplicates": docs})

    result = await approve_all(db)
    assert result["approved_count"] == 2

    # Skipped não foi alterado
    skipped_doc = next(d for d in db["storage_duplicates"]._docs if d["filename"] == "c.mkv")
    assert skipped_doc["status"] == "skipped"
