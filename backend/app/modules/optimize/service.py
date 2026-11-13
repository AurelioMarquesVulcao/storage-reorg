"""
optimize/service.py — Plano de reorganização de discos.

Funções principais:
  get_hd_info(db)            — lê shutil.disk_usage de cada HD montado
  generate_optimize_plan(db) — gera lista de MoveProposal, salva em storage_moves
  approve_moves(db, ids)     — marca approved=True
  execute_moves(db)          — rsync --remove-source-files para aprovados, loga em storage_actions
"""

import os
import shutil
import subprocess
import uuid
from datetime import datetime, timezone
from typing import Optional

from bson import ObjectId

from app.shared.config import settings


# ---------------------------------------------------------------------------
# helpers
# ---------------------------------------------------------------------------

def _human(b: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b //= 1024
    return f"{b:.1f} TB"


def _doc_to_dict(doc: dict) -> dict:
    """Converte _id ObjectId para string id."""
    doc = dict(doc)
    if "_id" in doc:
        doc["id"] = str(doc.pop("_id"))
    return doc


def _hd_label(mount: str) -> str:
    return mount.lstrip("/").replace("/", "-")


# ---------------------------------------------------------------------------
# HD info (síncrono — pode ser chamado diretamente pelo router)
# ---------------------------------------------------------------------------

def get_hd_info_sync() -> list[dict]:
    """Lê shutil.disk_usage de cada HD configurado e retorna lista de dicts."""
    result = []
    for mount in settings.HDS:
        label = _hd_label(mount)
        try:
            usage = shutil.disk_usage(mount)
            size_b = usage.total
            used_b = usage.used
            free_b = usage.free
            pct = round(used_b / size_b * 100, 1) if size_b else 0.0
        except (FileNotFoundError, PermissionError):
            size_b = used_b = free_b = 0
            pct = 0.0

        result.append({
            "mount": mount,
            "label": label,
            "size_bytes": size_b,
            "used_bytes": used_b,
            "free_bytes": free_b,
            "use_pct": pct,
            "size_human": _human(size_b),
            "used_human": _human(used_b),
            "free_human": _human(free_b),
        })
    return result


async def get_hd_info(db) -> list[dict]:
    """Async wrapper — lê shutil.disk_usage de cada HD montado."""
    return get_hd_info_sync()


# ---------------------------------------------------------------------------
# Plano de movimentações estático (baseado na análise dos discos)
# ---------------------------------------------------------------------------

GB = 1024 ** 3

# Movimentações identificadas manualmente durante análise dos discos.
# type: DELETE | MOVE | MERGE
_STATIC_PROPOSALS = [
    {
        "move_type": "DELETE",
        "folder": "/mnt/1tera/Mangas - Capitulos - test",
        "size_bytes": int(22 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "",
        "reason": "Resíduo de teste — pasta de capítulos de mangá usada em testes; pode ser removida com segurança.",
    },
    {
        "move_type": "DELETE",
        "folder": "/mnt/1tera/Mangas - HTML Cache",
        "size_bytes": int(3.6 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "",
        "reason": "Cache HTML de mangás — dados regeneráveis; ocupam espaço desnecessário.",
    },
    {
        "move_type": "MERGE",
        "folder": "/mnt/1tera/Mangas - Extracao - Original",
        "size_bytes": int(1.1 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "/mnt/1tera",
        "reason": "Encoding incorreto no nome da pasta; deve ser mesclado em 'Mangas - Extração - Original'.",
    },
    {
        "move_type": "MOVE",
        "folder": "/mnt/1tera/Backup-arquivos-1tb",
        "size_bytes": int(43 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "/mnt/dados",
        "reason": "Backup pertence ao HD de dados (DADOS); libera 43 GB do 1TERA crítico (88% cheio).",
    },
    {
        "move_type": "MOVE",
        "folder": "/mnt/1tera/backup_pendrive128",
        "size_bytes": int(60 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "/mnt/dados",
        "reason": "Backup de pendrive pertence ao HD de dados (DADOS); libera 60 GB do 1TERA crítico.",
    },
    {
        "move_type": "MOVE",
        "folder": "/mnt/aurelio-yasmin/famosas",
        "size_bytes": int(106 * GB),
        "from_hd": "/mnt/aurelio-yasmin",
        "to_hd": "/mnt/1tb-filmes",
        "reason": "Conteúdo de filmes de famosas deve residir em 1TB-Filmes (HD de filmes por artista).",
    },
    {
        "move_type": "MOVE",
        "folder": "/mnt/aurelio-yasmin/Não Separado",
        "size_bytes": int(120 * GB),
        "from_hd": "/mnt/aurelio-yasmin",
        "to_hd": "/mnt/1tb-filmes",
        "reason": "Conteúdo não separado de filmes deve ir para 1TB-Filmes/nao-separado.",
    },
    {
        "move_type": "MOVE",
        "folder": "/mnt/1tera/Torrent",
        "size_bytes": int(168 * GB),
        "from_hd": "/mnt/1tera",
        "to_hd": "/mnt/samsung300",
        "reason": "Torrents em andamento devem ficar em Samsung300 (staging/downloads); libera 168 GB do 1TERA.",
    },
]


# ---------------------------------------------------------------------------
# generate_optimize_plan
# ---------------------------------------------------------------------------

async def generate_optimize_plan(db) -> list[dict]:
    """Gera lista de MoveProposal com base nas movimentações identificadas.
    Limpa propostas anteriores e salva novas em storage_moves.
    Retorna lista de dicts."""

    now = datetime.now(timezone.utc).isoformat()

    # Remove plano anterior
    await db["storage_moves"].delete_many({})

    docs = []
    for p in _STATIC_PROPOSALS:
        doc = {
            "move_type": p["move_type"],
            "folder": p["folder"],
            "size_bytes": p["size_bytes"],
            "size_human": _human(p["size_bytes"]),
            "from_hd": p["from_hd"],
            "to_hd": p["to_hd"],
            "reason": p["reason"],
            "approved": False,
            "status": "pending",
            "created_at": now,
        }
        docs.append(doc)

    if docs:
        await db["storage_moves"].insert_many(docs)

    # Lê de volta para retornar com _id convertido
    cursor = db["storage_moves"].find({})
    saved = await cursor.to_list(length=None)

    await db["storage_logs"].insert_one({
        "event": "optimize_plan_generated",
        "count": len(saved),
        "timestamp": now,
    })

    return [_doc_to_dict(d) for d in saved]


# ---------------------------------------------------------------------------
# list_proposals
# ---------------------------------------------------------------------------

async def list_proposals(
    db,
    status: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
) -> dict:
    """Pagina storage_moves com filtro opcional por status."""
    query: dict = {}
    if status:
        query["status"] = status

    total = await db["storage_moves"].count_documents(query)
    cursor = (
        db["storage_moves"]
        .find(query)
        .sort("size_bytes", -1)
        .skip(offset)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return {
        "total": total,
        "items": [_doc_to_dict(d) for d in docs],
    }


# ---------------------------------------------------------------------------
# approve_moves
# ---------------------------------------------------------------------------

async def approve_moves(db, ids: list[str]) -> dict:
    """Marca os ids fornecidos como approved=True em storage_moves."""
    oids = []
    for i in ids:
        try:
            oids.append(ObjectId(i))
        except Exception:
            pass

    if not oids:
        return {"approved_count": 0}

    result = await db["storage_moves"].update_many(
        {"_id": {"$in": oids}},
        {"$set": {"approved": True, "status": "approved"}},
    )
    return {"approved_count": result.modified_count}


async def approve_one(db, item_id: str) -> Optional[dict]:
    """Aprova uma única proposta pelo id."""
    try:
        oid = ObjectId(item_id)
    except Exception:
        return None

    result = await db["storage_moves"].find_one_and_update(
        {"_id": oid},
        {"$set": {"approved": True, "status": "approved"}},
        return_document=True,
    )
    if result is None:
        return None
    return {"id": item_id, "approved": True, "status": "approved"}


async def skip_one(db, item_id: str) -> Optional[dict]:
    """Pula uma proposta."""
    try:
        oid = ObjectId(item_id)
    except Exception:
        return None

    result = await db["storage_moves"].find_one_and_update(
        {"_id": oid},
        {"$set": {"approved": False, "status": "skipped"}},
        return_document=True,
    )
    if result is None:
        return None
    return {"id": item_id, "approved": False, "status": "skipped"}


# ---------------------------------------------------------------------------
# hd_state — estado atual e projetado
# ---------------------------------------------------------------------------

async def get_hd_state(db) -> list[dict]:
    """Retorna estado atual e projetado (após movimentações aprovadas) de cada HD."""
    hd_info = get_hd_info_sync()
    hd_map = {h["mount"]: h for h in hd_info}

    # Acumula delta por HD para movimentações aprovadas
    delta: dict[str, int] = {m: 0 for m in hd_map}

    cursor = db["storage_moves"].find({"approved": True})
    approved = await cursor.to_list(length=None)

    for doc in approved:
        move_type = doc.get("move_type", "MOVE")
        size = doc.get("size_bytes", 0)
        from_hd = doc.get("from_hd", "")
        to_hd = doc.get("to_hd", "")

        if move_type in ("DELETE", "MERGE"):
            if from_hd in delta:
                delta[from_hd] -= size
        elif move_type == "MOVE":
            if from_hd in delta:
                delta[from_hd] -= size
            if to_hd in delta:
                delta[to_hd] += size

    result = []
    for mount, info in hd_map.items():
        size_b = info["size_bytes"]
        current_used = info["used_bytes"]
        projected_used = max(0, current_used + delta.get(mount, 0))
        current_pct = info["use_pct"]
        projected_pct = round(projected_used / size_b * 100, 1) if size_b else 0.0

        result.append({
            "mount": mount,
            "label": info["label"],
            "current_use_pct": current_pct,
            "projected_use_pct": projected_pct,
            "current_used_human": info["used_human"],
            "projected_used_human": _human(projected_used),
            "delta_bytes": delta.get(mount, 0),
            "delta_human": _human(abs(delta.get(mount, 0))),
        })

    return result


# ---------------------------------------------------------------------------
# execute_moves
# ---------------------------------------------------------------------------

async def execute_moves(db) -> dict:
    """Executa rsync --remove-source-files para movimentações aprovadas.
    DELETEs usam rm -rf. MERGEs usam rsync + rm.
    Registra cada ação em storage_actions e storage_logs."""

    cursor = db["storage_moves"].find({"status": "approved"})
    approved = await cursor.to_list(length=None)

    moved_count = 0
    deleted_count = 0
    error_count = 0
    freed_bytes = 0
    now = datetime.now(timezone.utc).isoformat()

    for doc in approved:
        item_id = doc["_id"]
        move_type = doc.get("move_type", "MOVE")
        folder = doc.get("folder", "")
        to_hd = doc.get("to_hd", "")
        size = doc.get("size_bytes", 0)
        from_hd = doc.get("from_hd", "")

        action: dict = {
            "type": move_type.lower(),
            "path": folder,
            "size_bytes": size,
            "size_human": _human(size),
            "hd": from_hd,
            "timestamp": now,
            "move_id": str(item_id),
        }

        try:
            if move_type == "DELETE":
                if os.path.exists(folder):
                    result = subprocess.run(
                        ["rm", "-rf", folder],
                        capture_output=True, text=True, timeout=3600,
                    )
                    if result.returncode == 0:
                        action["status"] = "success"
                        freed_bytes += size
                        deleted_count += 1
                    else:
                        action["status"] = "error"
                        action["error_msg"] = result.stderr[:500]
                        error_count += 1
                else:
                    action["status"] = "error"
                    action["error_msg"] = "Source path not found"
                    error_count += 1

            elif move_type == "MERGE":
                # Renomeia/mescla para versão com encoding correto
                dest_folder = folder.replace("Extracao", "Extração")
                if os.path.exists(folder):
                    os.makedirs(dest_folder, exist_ok=True)
                    result = subprocess.run(
                        ["rsync", "-av", "--remove-source-files",
                         folder + "/", dest_folder + "/"],
                        capture_output=True, text=True, timeout=3600,
                    )
                    if result.returncode == 0:
                        # Remove diretório vazio de origem
                        try:
                            os.rmdir(folder)
                        except OSError:
                            pass
                        action["status"] = "success"
                        freed_bytes += size
                        moved_count += 1
                    else:
                        action["status"] = "error"
                        action["error_msg"] = result.stderr[:500]
                        error_count += 1
                else:
                    action["status"] = "error"
                    action["error_msg"] = "Source path not found"
                    error_count += 1

            else:  # MOVE
                if to_hd:
                    # Destino: mesmo basename da pasta origem dentro do HD destino
                    folder_name = os.path.basename(folder.rstrip("/"))

                    # Casos especiais mapeados na análise
                    _DEST_MAP = {
                        "/mnt/1tera/Backup-arquivos-1tb": "/mnt/dados/backup/Backup-arquivos-1tb",
                        "/mnt/1tera/backup_pendrive128": "/mnt/dados/backup/backup_pendrive128",
                        "/mnt/aurelio-yasmin/famosas": "/mnt/1tb-filmes/filmes/famosas",
                        "/mnt/aurelio-yasmin/Não Separado": "/mnt/1tb-filmes/nao-separado",
                        "/mnt/1tera/Torrent": "/mnt/samsung300/Torrent",
                    }
                    dest = _DEST_MAP.get(folder, os.path.join(to_hd, folder_name))

                    if os.path.exists(folder):
                        os.makedirs(os.path.dirname(dest), exist_ok=True)
                        result = subprocess.run(
                            ["rsync", "-av", "--remove-source-files",
                             folder + "/", dest + "/"],
                            capture_output=True, text=True, timeout=7200,
                        )
                        if result.returncode == 0:
                            try:
                                os.rmdir(folder)
                            except OSError:
                                pass
                            action["status"] = "success"
                            freed_bytes += size
                            moved_count += 1
                        else:
                            action["status"] = "error"
                            action["error_msg"] = result.stderr[:500]
                            error_count += 1
                    else:
                        action["status"] = "error"
                        action["error_msg"] = "Source path not found"
                        error_count += 1
                else:
                    action["status"] = "error"
                    action["error_msg"] = "No destination HD specified"
                    error_count += 1

        except subprocess.TimeoutExpired:
            action["status"] = "error"
            action["error_msg"] = "Process timed out"
            error_count += 1
        except Exception as exc:
            action["status"] = "error"
            action["error_msg"] = str(exc)[:500]
            error_count += 1

        # Persiste ação
        await db["storage_actions"].insert_one(action)
        await db["storage_logs"].insert_one({
            "event": move_type.lower(),
            "path": folder,
            "status": action["status"],
            "error_msg": action.get("error_msg"),
            "timestamp": now,
        })

        # Atualiza status da proposta
        new_status = "moved" if action["status"] == "success" else "error"
        await db["storage_moves"].update_one(
            {"_id": item_id},
            {"$set": {"status": new_status}},
        )

    return {
        "moved_count": moved_count,
        "deleted_count": deleted_count,
        "error_count": error_count,
        "freed_bytes": freed_bytes,
        "freed_human": _human(freed_bytes),
    }
