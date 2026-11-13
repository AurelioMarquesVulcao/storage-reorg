"""
tests/unit/test_optimize_service.py — Testes unitários do módulo optimize.

Mockam DB (Motor) e filesystem (shutil/os/subprocess).
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from bson import ObjectId


# ---------------------------------------------------------------------------
# Helpers para mock de cursor Motor
# ---------------------------------------------------------------------------

def _make_cursor(docs: list[dict]):
    """Retorna um mock de cursor Motor que suporta to_list e find_one."""
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = cursor
    cursor.to_list = AsyncMock(return_value=docs)
    return cursor


def _make_db(collection_data: dict[str, list[dict]] | None = None):
    """Retorna um mock de DB Motor com coleções configuráveis.
    Cada nome de coleção retorna sempre o mesmo objeto mock (cache interno)."""
    collection_data = collection_data or {}

    db = MagicMock()
    _cache: dict[str, MagicMock] = {}

    def _get_collection(name):
        if name in _cache:
            return _cache[name]
        col = MagicMock()
        docs = collection_data.get(name, [])

        col.find.return_value = _make_cursor(docs)
        col.find_one = AsyncMock(return_value=docs[0] if docs else None)
        col.find_one_and_update = AsyncMock(return_value=docs[0] if docs else None)
        col.insert_one = AsyncMock(return_value=MagicMock(inserted_id=ObjectId()))
        col.insert_many = AsyncMock(return_value=MagicMock(inserted_ids=[ObjectId() for _ in docs]))
        col.delete_many = AsyncMock(return_value=MagicMock(deleted_count=len(docs)))
        col.count_documents = AsyncMock(return_value=len(docs))
        col.update_one = AsyncMock(return_value=MagicMock(modified_count=1))
        col.update_many = AsyncMock(return_value=MagicMock(modified_count=len(docs)))
        _cache[name] = col
        return col

    db.__getitem__ = MagicMock(side_effect=_get_collection)
    return db


# ---------------------------------------------------------------------------
# Teste 1 — get_hd_info retorna lista correta de HDs
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_hd_info_returns_all_hds():
    """get_hd_info deve retornar uma entrada para cada HD configurado,
    com os campos obrigatórios presentes."""
    from app.modules.optimize import service
    from app.shared.config import settings

    # Mocka shutil.disk_usage para retornar valores fixos
    fake_usage = MagicMock()
    fake_usage.total = 500 * (1024 ** 3)   # 500 GB
    fake_usage.used  = 250 * (1024 ** 3)   # 250 GB
    fake_usage.free  = 250 * (1024 ** 3)   # 250 GB

    db = _make_db()

    with patch("app.modules.optimize.service.shutil.disk_usage", return_value=fake_usage):
        result = await service.get_hd_info(db)

    assert isinstance(result, list)
    assert len(result) == len(settings.HDS), (
        f"Esperado {len(settings.HDS)} HDs, obtido {len(result)}"
    )

    required_fields = {
        "mount", "label", "size_bytes", "used_bytes", "free_bytes",
        "use_pct", "size_human", "used_human", "free_human",
    }
    for hd in result:
        missing = required_fields - hd.keys()
        assert not missing, f"Campos ausentes em {hd['mount']}: {missing}"
        assert hd["use_pct"] == 50.0, f"Percentual inesperado: {hd['use_pct']}"


# ---------------------------------------------------------------------------
# Teste 2 — generate_optimize_plan persiste propostas e retorna lista
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_generate_optimize_plan_saves_proposals():
    """generate_optimize_plan deve salvar propostas em storage_moves
    e retornar lista com todos os campos obrigatórios."""
    from app.modules.optimize import service

    # Simula ObjectIds para os documentos inseridos
    inserted_ids = [ObjectId() for _ in service._STATIC_PROPOSALS]

    # Documentos que serão "lidos de volta" após insert_many
    saved_docs = []
    for i, p in enumerate(service._STATIC_PROPOSALS):
        saved_docs.append({
            "_id":        inserted_ids[i],
            "move_type":  p["move_type"],
            "folder":     p["folder"],
            "size_bytes": p["size_bytes"],
            "size_human": service._human(p["size_bytes"]),
            "from_hd":    p["from_hd"],
            "to_hd":      p["to_hd"],
            "reason":     p["reason"],
            "approved":   False,
            "status":     "pending",
            "created_at": "2026-11-13T12:00:00+00:00",
        })

    db = _make_db({
        "storage_moves": saved_docs,
        "storage_logs":  [],
    })

    result = await service.generate_optimize_plan(db)

    # Captura a coleção (mesma instância usada pelo service)
    moves_col = db["storage_moves"]

    # Verifica que delete_many foi chamado (limpa plano anterior)
    moves_col.delete_many.assert_called_once()

    # Verifica que insert_many foi chamado com o número correto de propostas
    moves_col.insert_many.assert_called_once()
    call_args = moves_col.insert_many.call_args[0][0]
    assert len(call_args) == len(service._STATIC_PROPOSALS), (
        f"Esperado {len(service._STATIC_PROPOSALS)} propostas, inserido {len(call_args)}"
    )

    # Verifica estrutura do retorno
    assert isinstance(result, list)
    assert len(result) == len(service._STATIC_PROPOSALS)
    for item in result:
        assert "id" in item, "Campo 'id' ausente no resultado"
        assert "_id" not in item, "Campo '_id' não deve estar exposto"
        assert "folder" in item
        assert "move_type" in item
        assert "approved" in item
        assert item["approved"] is False

    # storage_logs deve ter recebido insert_one
    db["storage_logs"].insert_one.assert_called_once()


# ---------------------------------------------------------------------------
# Teste 3 — approve_moves e execute_moves (MOVE simulado com sucesso)
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_approve_and_execute_moves():
    """approve_moves deve marcar approved=True;
    execute_moves deve chamar rsync para MOVEs aprovados e registrar ação."""
    from app.modules.optimize import service

    oid = ObjectId()
    str_id = str(oid)

    # Documento de proposta aprovada (MOVE)
    approved_doc = {
        "_id":        oid,
        "move_type":  "MOVE",
        "folder":     "/mnt/1tera/Torrent",
        "size_bytes": int(168 * (1024 ** 3)),
        "from_hd":    "/mnt/1tera",
        "to_hd":      "/mnt/samsung300",
        "reason":     "Torrents em andamento devem ficar em Samsung300",
        "approved":   True,
        "status":     "approved",
    }

    db = _make_db({
        "storage_moves":   [approved_doc],
        "storage_actions": [],
        "storage_logs":    [],
    })

    # Captura a coleção antes das chamadas de serviço
    moves_col = db["storage_moves"]

    # --- approve_moves ---
    result_approve = await service.approve_moves(db, [str_id])
    assert "approved_count" in result_approve
    moves_col.update_many.assert_called_once()

    # --- execute_moves ---
    # Mocka os.path.exists → True, os.makedirs → no-op, os.rmdir → no-op
    # e subprocess.run → sucesso
    mock_proc = MagicMock()
    mock_proc.returncode = 0
    mock_proc.stderr = ""

    with (
        patch("app.modules.optimize.service.os.path.exists", return_value=True),
        patch("app.modules.optimize.service.os.makedirs"),
        patch("app.modules.optimize.service.os.rmdir"),
        patch("app.modules.optimize.service.subprocess.run", return_value=mock_proc) as mock_run,
    ):
        result_exec = await service.execute_moves(db)

        # Verifica que rsync foi chamado com --remove-source-files (dentro do with)
        assert mock_run.called, "subprocess.run não foi chamado"
        rsync_args = mock_run.call_args[0][0]
        assert "rsync" in rsync_args, "rsync não foi usado"
        assert "--remove-source-files" in rsync_args, "rsync --remove-source-files não foi chamado"

    assert result_exec["moved_count"] == 1, (
        f"Esperado 1 move bem-sucedido, obtido {result_exec['moved_count']}"
    )
    assert result_exec["error_count"] == 0, (
        f"Esperado 0 erros, obtido {result_exec['error_count']}"
    )
    assert result_exec["freed_bytes"] == approved_doc["size_bytes"]

    # Verifica que storage_actions e storage_logs receberam insert_one
    db["storage_actions"].insert_one.assert_called_once()
    db["storage_logs"].insert_one.assert_called_once()
