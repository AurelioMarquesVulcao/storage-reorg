import os
import shutil
import uuid
from datetime import datetime, timezone
from collections import defaultdict
from typing import Optional
from pathlib import Path

from app.shared.config import settings


HD_PRIORITY = [
    "/mnt/1tb-filmes",
    "/mnt/1tera",
    "/mnt/aurelio-yasmin",
    "/mnt/dados",
    "/mnt/samsung300",
]


def _human(b: int) -> str:
    for unit in ["B", "KB", "MB", "GB"]:
        if b < 1024:
            return f"{b:.1f} {unit}"
        b //= 1024
    return f"{b:.1f} TB"


def _get_hd(path: str) -> str:
    for hd in HD_PRIORITY:
        if path.startswith(hd):
            return hd
    for hd in settings.HDS:
        if path.startswith(hd):
            return hd
    return "unknown"


def _read_tsv(tsv_path: str) -> list[dict]:
    """Lê /tmp/all_videos.tsv e retorna lista de dicts com size, name, path."""
    files = []
    with open(tsv_path, encoding="utf-8", errors="replace") as f:
        for line in f:
            parts = line.strip().split("\t")
            if len(parts) >= 3:
                try:
                    size = int(parts[0])
                except ValueError:
                    continue
                name = parts[1]
                path = parts[2]
                files.append({"size": size, "name": name, "path": path, "hd": _get_hd(path)})
    return files


def _scan_live(hds: list[str]) -> list[dict]:
    """Varre os HDs ao vivo com os.walk como fallback."""
    files = []
    extensions = set(settings.VIDEO_EXTENSIONS)
    for hd in hds:
        if not os.path.isdir(hd):
            continue
        for root, _, filenames in os.walk(hd):
            for fname in filenames:
                if any(fname.lower().endswith(ext) for ext in extensions):
                    full_path = os.path.join(root, fname)
                    try:
                        size = os.path.getsize(full_path)
                    except OSError:
                        size = 0
                    files.append({
                        "size": size,
                        "name": fname,
                        "path": full_path,
                        "hd": _get_hd(full_path),
                    })
    return files


def _detect_dups(files: list[dict]) -> tuple[list[dict], int]:
    """Agrupa por nome, determina master, retorna (duplicatas, total_wasted_bytes)."""
    by_name: dict[str, list[dict]] = defaultdict(list)
    for f in files:
        by_name[f["name"]].append(f)

    duplicates = []
    total_wasted = 0

    for name, copies in by_name.items():
        if len(copies) < 2:
            continue

        master = None
        for hd in HD_PRIORITY:
            for c in copies:
                if c["hd"] == hd:
                    master = c
                    break
            if master:
                break
        if not master:
            master = max(copies, key=lambda x: x["size"])

        extra = [c for c in copies if c["path"] != master["path"]]
        wasted = sum(c["size"] for c in extra)
        total_wasted += wasted

        duplicates.append({
            "filename": name,
            "size_bytes": master["size"],
            "size_human": _human(master["size"]),
            "master_path": master["path"],
            "master_hd": master["hd"],
            "copies": [{"path": c["path"], "hd": c["hd"]} for c in extra],
            "copies_count": len(extra),
            "wasted_bytes": wasted,
            "wasted_human": _human(wasted),
            "approved": False,
            "status": "pending",
        })

    duplicates.sort(key=lambda x: x["wasted_bytes"], reverse=True)
    return duplicates, total_wasted


async def scan_hds(db) -> str:
    """Varre os HDs, lê /tmp/all_videos.tsv se existir (fallback: find ao vivo).
    Salva resultado em storage_scans e storage_duplicates. Retorna scan_id."""
    scan_id = str(uuid.uuid4())
    scanned_at = datetime.now(timezone.utc).isoformat()

    # Registra scan como running
    await db["storage_scans"].insert_one({
        "scan_id": scan_id,
        "status": "running",
        "total_files": 0,
        "total_duplicates": 0,
        "total_wasted_bytes": 0,
        "total_wasted_human": "0 B",
        "scanned_at": scanned_at,
    })

    try:
        tsv_path = "/tmp/all_videos.tsv"
        if os.path.isfile(tsv_path):
            files = _read_tsv(tsv_path)
        else:
            files = _scan_live(settings.HDS)

        duplicates, total_wasted = _detect_dups(files)

        # Salva duplicatas na coleção, substituindo anteriores
        await db["storage_duplicates"].delete_many({})
        if duplicates:
            docs = [{"scan_id": scan_id, **d} for d in duplicates]
            await db["storage_duplicates"].insert_many(docs)

        # Atualiza scan como done
        await db["storage_scans"].update_one(
            {"scan_id": scan_id},
            {"$set": {
                "status": "done",
                "total_files": len(files),
                "total_duplicates": len(duplicates),
                "total_wasted_bytes": total_wasted,
                "total_wasted_human": _human(total_wasted),
            }},
        )

        # Log geral
        await db["storage_logs"].insert_one({
            "event": "scan_complete",
            "scan_id": scan_id,
            "total_files": len(files),
            "total_duplicates": len(duplicates),
            "total_wasted_bytes": total_wasted,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        })

    except Exception as exc:
        await db["storage_scans"].update_one(
            {"scan_id": scan_id},
            {"$set": {"status": "error", "error": str(exc)}},
        )
        raise

    return scan_id


async def get_scan_status(db, scan_id: str) -> Optional[dict]:
    """Retorna status da varredura pelo scan_id."""
    doc = await db["storage_scans"].find_one({"scan_id": scan_id}, {"_id": 0})
    return doc


async def get_latest_scan(db) -> Optional[dict]:
    """Retorna o scan mais recente."""
    cursor = db["storage_scans"].find({}, {"_id": 0}).sort("scanned_at", -1).limit(1)
    docs = await cursor.to_list(length=1)
    return docs[0] if docs else None


def get_hd_info() -> list[dict]:
    """Retorna info de uso de cada HD configurado."""
    result = []
    for mount in settings.HDS:
        label = mount.lstrip("/").replace("/", "-")
        try:
            usage = shutil.disk_usage(mount)
            size_b = usage.total
            used_b = usage.used
            free_b = usage.free
            pct = round(used_b / size_b * 100, 1) if size_b else 0.0
        except FileNotFoundError:
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
